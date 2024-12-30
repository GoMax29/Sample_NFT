"use client";

import { useState, useEffect } from "react";
import { useAccount, usePublicClient, useReadContract } from "wagmi";
import Link from "next/link";
import AudioPlayer from "@/components/shared/AudioPlayer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  FACTORY_CONTRACT_ADDRESS,
  FACTORY_ABI,
  ARTIST_COLLECTIONS_ABI,
} from "@/constants";
import { parseAbiItem } from "viem";
import "@/app/globals.css";
export default function MySamples() {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const { address: userAddress, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { toast } = useToast();
  console.log("Connected address:", userAddress);
  console.log("Factory contract:", FACTORY_CONTRACT_ADDRESS);
  console.log("Is connected:", isConnected);

  // Read registered artists array length
  const { data: registeredArtists } = useReadContract({
    address: FACTORY_CONTRACT_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "registeredArtists",
    args: [0],
    onError: (error) => {
      console.error("Error reading registered artists:", error);
    },
  });

  useEffect(() => {
    const fetchUserSamples = async () => {
      if (!userAddress || !registeredArtists) {
        console.log("Missing requirements:", {
          userAddress,
          registeredArtists,
        });
        return;
      }

      try {
        const userSamples = [];
        let index = 0;
        const artists = [];

        // Get all registered artists
        while (true) {
          try {
            const artist = await publicClient.readContract({
              address: FACTORY_CONTRACT_ADDRESS,
              abi: FACTORY_ABI,
              functionName: "registeredArtists",
              args: [index],
            });
            console.log("Found artist:", artist);
            if (!artist) break;
            artists.push(artist);
            index++;
          } catch (error) {
            console.log("Finished getting artists at index:", index);
            break;
          }
        }

        console.log("All artists found:", artists);

        // Process each artist
        for (const artistAddress of artists) {
          // Get artist info first
          const artistData = await publicClient.readContract({
            address: FACTORY_CONTRACT_ADDRESS,
            abi: FACTORY_ABI,
            functionName: "artistInfo",
            args: [artistAddress],
          });
          console.log("Artist info:", { artistAddress, artistData });
          const artistName = artistData[0]; // First element is the name

          // Get collection address
          const collectionAddress = await publicClient.readContract({
            address: FACTORY_CONTRACT_ADDRESS,
            abi: FACTORY_ABI,
            functionName: "artistToCollections",
            args: [artistAddress],
          });

          // Get TransferBatch events
          const transferBatchEvent = parseAbiItem(
            "event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)"
          );

          const mintEvents = await publicClient.getLogs({
            address: collectionAddress,
            event: transferBatchEvent,
            fromBlock: 0n,
            toBlock: "latest",
          });

          // Filter out duplicate events
          const uniqueEvents = mintEvents.reduce((acc, event) => {
            if (!acc.some((e) => e.transactionHash === event.transactionHash)) {
              acc.push(event);
            }
            return acc;
          }, []);

          console.log("Transfer events found:", uniqueEvents);

          // Process each minted token
          for (const event of uniqueEvents) {
            console.log("Processing event:", {
              operator: event.args.operator,
              from: event.args.from,
              to: event.args.to,
              ids: event.args.ids.map((id) => id.toString()),
              values: event.args.values.map((v) => v.toString()),
              txHash: event.transactionHash,
            });

            for (const tokenId of event.args.ids) {
              try {
                // Get collection ID from token ID first
                const collectionId = await publicClient.readContract({
                  address: collectionAddress,
                  abi: ARTIST_COLLECTIONS_ABI,
                  functionName: "getCollectionId",
                  args: [tokenId],
                });

                // Now we can get collection info
                const collectionInfo = await publicClient.readContract({
                  address: collectionAddress,
                  abi: ARTIST_COLLECTIONS_ABI,
                  functionName: "collections",
                  args: [collectionId],
                });

                // Check token existence
                const tokenData = await publicClient.readContract({
                  address: collectionAddress,
                  abi: ARTIST_COLLECTIONS_ABI,
                  functionName: "tokens",
                  args: [tokenId],
                });

                if (tokenData[2]) {
                  const tokenURI = await publicClient.readContract({
                    address: collectionAddress,
                    abi: ARTIST_COLLECTIONS_ABI,
                    functionName: "uri",
                    args: [tokenId],
                  });

                  const metadataURL = tokenURI.replace(
                    "ipfs://",
                    "https://amethyst-worrying-squid-449.mypinata.cloud/ipfs/"
                  );

                  try {
                    const response = await fetch(metadataURL);
                    const metadata = await response.json();

                    // Add metadata to samples array with proper structure
                    userSamples.push({
                      tokenId: metadata.token.id || tokenId.toString(),
                      originalTokenId: tokenId,
                      name: metadata.token?.name || `Sample ${tokenId}`,
                      collectionAddress,
                      collectionId: metadata.collection?.id || "",
                      collectionName:
                        metadata.collection?.name ||
                        metadata.style ||
                        "Unknown Style",
                      artistName: metadata.artist?.name || "Unknown Artist",
                      animation_url: metadata.token?.sample || null,
                      metadata: metadata,
                    });
                  } catch (error) {
                    console.error("Error fetching metadata:", error);
                    userSamples.push({
                      tokenId: tokenId.toString(),
                      name: `Sample ${tokenId}`,
                      collectionAddress,
                      collectionId: "",
                      collectionName: "Unknown Style",
                      artistName: "Unknown Artist",
                      animation_url: null,
                    });
                  }
                }
              } catch (error) {
                console.error("Error processing token:", {
                  tokenId: tokenId.toString(),
                  error: error.message,
                });
              }
            }
          }
        }

        setSamples(userSamples);
      } catch (error) {
        console.error("Error fetching samples:", error);
        toast({
          title: "Error",
          description: "Failed to fetch your samples",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserSamples();
  }, [userAddress, registeredArtists, publicClient, toast]);

  const handleDownload = async (
    url,
    artistName,
    collectionName,
    sampleName
  ) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;

      // Create filename: artist-collection-sample
      const fileName = `${artistName}-${collectionName}-${sampleName}`.replace(
        /\s+/g,
        "_"
      );
      a.download = `${fileName}.wav`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading sample:", error);
    }
  };

  const addToMetaMask = async (collectionAddress, originalTokenId) => {
    try {
      const response = await window.ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC1155",
          options: {
            address: collectionAddress,
            tokenId: originalTokenId.toString(),
          },
        },
      });

      if (response) {
        toast({
          title: "Success",
          description: "Token added to MetaMask",
        });
      }
    } catch (error) {
      console.error("Error adding to MetaMask:", error);
      toast({
        title: "Error",
        description: "Failed to add token to MetaMask",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">My Samples</h1>

      {!isConnected ? (
        <div className="text-center text-gray-500">
          Please connect your wallet to view your samples.
        </div>
      ) : loading ? (
        <div className="text-center text-gray-500">Loading your samples...</div>
      ) : samples.length === 0 ? (
        <div className="text-center text-gray-500">
          You haven't purchased any samples yet.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Play Sample
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Token ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Artist
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Collection
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {samples.map((sample, index) => (
                <tr
                  key={`${sample.collectionAddress}-${sample.tokenId}-${index}`}
                  className={index % 2 === 0 ? "bg-blue-50" : "bg-gray-50"}
                >
                  <td className="px-6 py-4">
                    {sample.animation_url && (
                      <AudioPlayer audioUrl={sample.animation_url} />
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sample.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sample.tokenId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sample.artistName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <Link
                      href={`/collection/${sample.artistName}/${sample.collectionId}`}
                      className="text-blue-600 hover:underline"
                    >
                      {sample.collectionName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    <Button
                      onClick={() =>
                        handleDownload(
                          sample.animation_url,
                          sample.artistName,
                          sample.collectionName,
                          sample.name
                        )
                      }
                      variant="outline"
                      className="mr-2"
                    >
                      Download Sample
                    </Button>
                    <Button
                      onClick={() =>
                        addToMetaMask(
                          sample.collectionAddress,
                          sample.originalTokenId || sample.tokenId
                        )
                      }
                      variant="outline"
                    >
                      Add to MetaMask
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
