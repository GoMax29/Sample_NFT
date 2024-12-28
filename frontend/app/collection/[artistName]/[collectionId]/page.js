"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  useReadContract,
  useWriteContract,
  usePublicClient,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  FACTORY_CONTRACT_ADDRESS,
  FACTORY_ABI,
  ARTIST_COLLECTIONS_ABI,
} from "@/constants";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import AudioPlayer from "@/components/shared/AudioPlayer";
import "@/app/globals.css";
import { formatEther } from "viem";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const retryOperation = async (operation, maxRetries = 3, delayMs = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      if (error.message.includes("429")) {
        console.log(`Attempt ${i + 1} failed, retrying after ${delayMs}ms...`);
        await delay(delayMs);
      } else {
        throw error;
      }
    }
  }
};

export default function CollectionPage() {
  const params = useParams();
  const { artistName, collectionId } = params;
  const publicClient = usePublicClient();

  const [collection, setCollection] = useState(null);
  const [samples, setSamples] = useState([]);
  const [selectedSamples, setSelectedSamples] = useState([]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [artistAddress, setArtistAddress] = useState(null);
  const [collectionAddress, setCollectionAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Step 1: Find artist address from ArtistRegistered event
  useEffect(() => {
    const fetchArtistAddress = async () => {
      setIsLoading(true);
      try {
        console.log("Searching for artist:", artistName);
        const artistRegisteredEvents = await publicClient.getLogs({
          address: FACTORY_CONTRACT_ADDRESS,
          event: {
            name: "ArtistRegistered",
            type: "event",
            inputs: [
              { name: "artistAddress", type: "address", indexed: true },
              { name: "name", type: "string" },
              { name: "deploymentDate", type: "uint256" },
            ],
          },
          fromBlock: 0n,
          toBlock: "latest",
        });

        const artistEvent = artistRegisteredEvents.find(
          (event) => event.args.name === artistName
        );

        if (artistEvent) {
          console.log("Found artist address:", artistEvent.args.artistAddress);
          setArtistAddress(artistEvent.args.artistAddress);
        }
      } catch (error) {
        console.error("Error fetching artist address:", error);
      }
    };

    if (artistName) {
      fetchArtistAddress();
    }
  }, [artistName, publicClient]);

  // Step 2: Get collection contract address from artistToCollections mapping
  const { data: fetchedCollectionAddress } = useReadContract({
    address: FACTORY_CONTRACT_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "artistToCollections",
    args: [artistAddress],
    enabled: !!artistAddress,
  });

  useEffect(() => {
    if (fetchedCollectionAddress) {
      console.log("Collection contract address:", fetchedCollectionAddress);
      setCollectionAddress(fetchedCollectionAddress);
    }
  }, [fetchedCollectionAddress]);

  // Step 3: Fetch token IDs from TokensBatchCreated events
  useEffect(() => {
    const fetchTokens = async () => {
      setIsLoading(true);
      try {
        console.log("Fetching tokens for collection:", collectionId);

        const tokenEvents = await retryOperation(async () => {
          return await publicClient.getLogs({
            address: collectionAddress,
            event: {
              name: "TokensBatchCreated",
              type: "event",
              inputs: [
                { name: "artist", type: "address", indexed: true },
                { name: "collectionId", type: "uint256", indexed: true },
                { name: "tokenIds", type: "uint256[]" },
                { name: "prices", type: "uint256[]" },
              ],
            },
            args: {
              collectionId: BigInt(collectionId),
            },
            fromBlock: 0n,
            toBlock: "latest",
          });
        });

        console.log("Token events found:", tokenEvents);

        if (tokenEvents.length === 0) {
          console.log("No token events found for this collection");
          setIsLoading(false);
          return;
        }

        // Step 4: Fetch URIs for each token
        const allSamples = await Promise.all(
          tokenEvents.flatMap(async (event) => {
            if (!event.args?.tokenIds) {
              console.log("No token IDs in event:", event);
              return [];
            }

            const tokenIds = event.args.tokenIds;
            const prices = event.args.prices;

            return Promise.all(
              tokenIds.map(async (tokenId, index) => {
                try {
                  // Get token URI
                  const tokenUri = await publicClient.readContract({
                    address: collectionAddress,
                    abi: ARTIST_COLLECTIONS_ABI,
                    functionName: "uri",
                    args: [tokenId],
                  });

                  console.log(`Token ${tokenId} URI:`, tokenUri);

                  // Fetch metadata from IPFS
                  const response = await fetch(
                    `https://ipfs.io/ipfs/${tokenUri.replace("ipfs://", "")}`
                  );
                  const metadata = await response.json();

                  console.log(`Token ${tokenId} metadata:`, metadata);

                  return {
                    id: tokenId.toString(),
                    name: metadata.token?.name || `Sample #${tokenId}`,
                    price: prices[index].toString(),
                    audioUrl: metadata.token?.sample || null, // Use the direct sample URL
                  };
                } catch (error) {
                  console.error(`Error processing token ${tokenId}:`, error);
                  return null;
                }
              })
            );
          })
        );

        // Filter out null values and flatten the array
        const validSamples = allSamples
          .flat()
          .filter((sample) => sample !== null);
        console.log("Processed samples:", validSamples);
        setSamples(validSamples);

        // Also fetch collection metadata if available
        if (tokenEvents[0]?.args?.artist) {
          const collectionDetails = await publicClient.readContract({
            address: collectionAddress,
            abi: ARTIST_COLLECTIONS_ABI,
            functionName: "collections",
            args: [collectionId],
          });

          setCollection({
            name: collectionDetails[0],
            style: collectionDetails[1],
            description: collectionDetails[2],
            isPublic: collectionDetails[3],
            totalSamples: collectionDetails[5]?.toString() || "0",
          });
        }
      } catch (error) {
        console.error("Error fetching tokens:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (collectionAddress && collectionId) {
      fetchTokens();
    }
  }, [collectionAddress, collectionId, publicClient]);

  // Handle checkbox changes
  const toggleSample = (id) => {
    setSelectedSamples((prev) => {
      const newSelection = prev.includes(id)
        ? prev.filter((sampleId) => sampleId !== id)
        : [...prev, id];

      setIsAllSelected(newSelection.length === samples.length);
      return newSelection;
    });
  };

  // Handle "Select All" checkbox
  const toggleAll = () => {
    if (isAllSelected) {
      setSelectedSamples([]);
    } else {
      setSelectedSamples(samples.map((sample) => sample.id));
    }
    setIsAllSelected(!isAllSelected);
  };

  // Get price for selected samples
  const { data: price } = useReadContract({
    address: collectionAddress,
    abi: ARTIST_COLLECTIONS_ABI,
    functionName: "getTokenPrice",
    args: selectedSamples?.[0] ? [selectedSamples[0]] : undefined,
  });

  const { writeContract } = useWriteContract();
  const { waitForTransactionReceipt } = useWaitForTransactionReceipt();

  const handleBatchMint = async () => {
    if (!selectedSamples.length || !price) return;

    try {
      // Calculate total cost
      const totalCost = BigInt(price) * BigInt(selectedSamples.length);
      console.log(`Total cost for minting: ${totalCost.toString()} wei`);

      // Execute the mint
      const hash = await writeContract({
        address: collectionAddress,
        abi: ARTIST_COLLECTIONS_ABI,
        functionName: "mintBatch",
        args: [selectedSamples],
        value: totalCost,
      });

      console.log("Transaction submitted:", hash);

      if (hash) {
        const receipt = await waitForTransactionReceipt({
          hash,
        });

        console.log("Transaction confirmed:", receipt);
      }
    } catch (error) {
      console.error("Error minting samples:", error);
    }
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="text-center py-8">Loading collection details...</div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost">← Back to Collections</Button>
        </Link>
      </div>

      {samples.length > 0 ? (
        <>
          <h1 className="text-3xl font-bold mb-2">
            {collection?.name || "Collection"}
          </h1>
          <p className="text-sm text-gray-500 mb-4">by {artistName}</p>
          <p className="text-gray-600 mb-4">{collection?.description}</p>

          <div className="mt-8">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={toggleAll}
                      id="select-all"
                    />
                    <label htmlFor="select-all" className="text-sm font-medium">
                      Select All
                    </label>
                  </div>
                  <Button
                    onClick={handleBatchMint}
                    disabled={!selectedSamples.length}
                  >
                    Mint Selected ({selectedSamples.length})
                  </Button>
                </div>
              </div>

              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-12 px-6 py-3"></th>
                    <th className="w-12 px-6 py-3"></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price (ETH)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {samples.map((sample, index) => (
                    <tr
                      key={sample.id}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="px-6 py-4">
                        <Checkbox
                          checked={selectedSamples.includes(sample.id)}
                          onCheckedChange={() => toggleSample(sample.id)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <AudioPlayer audioUrl={sample.audioUrl} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sample.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatEther(BigInt(sample.price))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center text-gray-500">
          No samples found in this collection.
        </div>
      )}
    </div>
  );
}
