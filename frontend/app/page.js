"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, usePublicClient } from "wagmi";
import {
  FACTORY_CONTRACT_ADDRESS,
  FACTORY_ABI,
  ARTIST_COLLECTIONS_ABI,
} from "@/constants";
import CollectionCard from "@/components/shared/CollectionCard";
import "../app/globals.css";
export default function Home() {
  const { address, isConnected } = useAccount();
  const [allCollections, setAllCollections] = useState([]);
  const [recommendedCollections, setRecommendedCollections] = useState([]);
  const publicClient = usePublicClient();

  // Fetch total number of artists
  const {
    data: totalArtists,
    isLoading: isTotalArtistsLoading,
    isError: isTotalArtistsError,
    error: totalArtistsError,
  } = useReadContract({
    address: FACTORY_CONTRACT_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getTotalArtists",
    enabled: true,
  });

  useEffect(() => {
    const fetchCollections = async () => {
      if (!totalArtists) return;

      try {
        console.log(
          "Starting to fetch collections. Total artists:",
          totalArtists.toString()
        );
        const collections = [];

        // Iterate through all artists
        for (let i = 0; i < parseInt(totalArtists.toString()); i++) {
          console.log(`Fetching artist at index ${i}`);

          const currentArtistAddress = await publicClient.readContract({
            address: FACTORY_CONTRACT_ADDRESS,
            abi: FACTORY_ABI,
            functionName: "registeredArtists",
            args: [i],
          });

          console.log(`Artist address at index ${i}:`, currentArtistAddress);

          if (
            !currentArtistAddress ||
            currentArtistAddress ===
              "0x0000000000000000000000000000000000000000" ||
            currentArtistAddress.length !== 42
          ) {
            console.log(`Skipping invalid artist address at index ${i}`);
            continue;
          }

          // Get artist info
          const artistInfo = await publicClient.readContract({
            address: FACTORY_CONTRACT_ADDRESS,
            abi: FACTORY_ABI,
            functionName: "getArtistInfo",
            args: [currentArtistAddress],
          });

          console.log(`Artist info for ${currentArtistAddress}:`, artistInfo);

          const collectionAddress = await publicClient.readContract({
            address: FACTORY_CONTRACT_ADDRESS,
            abi: FACTORY_ABI,
            functionName: "getArtistCollections",
            args: [currentArtistAddress],
          });

          console.log(
            `Collection address for ${currentArtistAddress}:`,
            collectionAddress
          );

          if (
            !collectionAddress ||
            collectionAddress === "0x0000000000000000000000000000000000000000"
          ) {
            console.log(
              `Skipping invalid collection address for artist ${currentArtistAddress}`
            );
            continue;
          }

          const collectionCounter = await publicClient.readContract({
            address: collectionAddress,
            abi: ARTIST_COLLECTIONS_ABI,
            functionName: "collectionCounter",
            args: [],
          });

          console.log(
            `Collection counter for ${collectionAddress}:`,
            collectionCounter.toString()
          );

          const counter = parseInt(collectionCounter.toString());
          if (counter > 0) {
            for (let j = 1; j <= counter; j++) {
              try {
                console.log(
                  `Fetching collection ${j} details from ${collectionAddress}`
                );

                const collectionDetails = await publicClient.readContract({
                  address: collectionAddress,
                  abi: ARTIST_COLLECTIONS_ABI,
                  functionName: "collections",
                  args: [j],
                });

                console.log(`Collection ${j} details:`, collectionDetails);

                if (collectionDetails && Array.isArray(collectionDetails)) {
                  // Skip empty collections or private collections
                  if (!collectionDetails[0] || collectionDetails[3] === false) {
                    console.log(
                      `Skipping empty or private collection ${j} (isPublic: ${collectionDetails[3]})`
                    );
                    continue;
                  }

                  // Get lastTokenId from collection details (index 5)
                  const lastTokenId = parseInt(collectionDetails[5].toString());
                  console.log(`Collection ${j} lastTokenId:`, lastTokenId);

                  collections.push({
                    artistName: artistInfo[0],
                    artistAddress: currentArtistAddress,
                    collectionId: j.toString(),
                    collectionName: collectionDetails[0],
                    style: collectionDetails[1],
                    description: collectionDetails[2],
                    isPublic: collectionDetails[3],
                    avatarIPFS_URL: collectionDetails[4],
                    totalSamples: lastTokenId.toString(),
                  });

                  console.log(
                    `Added public collection ${j} (isPublic: ${collectionDetails[3]}) to list with ${lastTokenId} samples`
                  );
                }
              } catch (error) {
                console.error(`Error fetching collection ${j}:`, error);
              }
            }
          }
        }

        console.log("Final collections array:", collections);
        setAllCollections(collections);

        // Handle recommendations
        if (isConnected && address) {
          try {
            const userArtistInfo = await publicClient.readContract({
              address: FACTORY_CONTRACT_ADDRESS,
              abi: FACTORY_ABI,
              functionName: "getArtistInfo",
              args: [address],
            });

            console.log(`User artist info for ${address}:`, userArtistInfo);

            if (userArtistInfo && Array.isArray(userArtistInfo)) {
              const userStyle = userArtistInfo[1];
              console.log("User style:", userStyle);

              if (userStyle && Array.isArray(userStyle)) {
                const recommended = collections
                  .filter((collection) => userStyle.includes(collection.style))
                  .slice(0, 5);

                console.log("Recommended collections:", recommended);
                setRecommendedCollections(recommended);
              }
            }
          } catch (userInfoError) {
            console.error("Error fetching user artist info:", userInfoError);
          }
        }
      } catch (error) {
        console.error("Error in fetchCollections:", error);
      }
    };

    fetchCollections();
  }, [totalArtists, address, isConnected, publicClient]);

  if (isTotalArtistsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-gray-500">Loading collections...</p>
      </div>
    );
  }

  if (isTotalArtistsError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-red-500">Failed to load collections.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Recommended Collections Section */}
      {isConnected && recommendedCollections.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Collections You May Like</h2>
          <div className="flex flex-wrap gap-6 justify-center">
            {recommendedCollections
              .filter((collection) => collection.isPublic === true)
              .map((collection, index) => (
                <CollectionCard
                  key={`${collection.artistAddress}-${collection.collectionId}`}
                  collection={collection}
                />
              ))}
          </div>
        </section>
      )}

      {/* All Collections Section */}
      <section>
        <h2 className="text-2xl font-bold mb-6">All Public Collections</h2>
        {allCollections.length > 0 ? (
          <div className="flex flex-wrap gap-6 justify-center">
            {allCollections
              .filter((collection) => collection.isPublic === true)
              .map((collection, index) => (
                <CollectionCard
                  key={`${collection.artistAddress}-${collection.collectionId}`}
                  collection={collection}
                />
              ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">
            No public collections available yet.
          </p>
        )}
      </section>
    </div>
  );
}
