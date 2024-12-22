"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { useRouter } from "next/navigation";
import { FACTORY_CONTRACT_ADDRESS, FACTORY_ABI } from "@/constants";
import CreateCollectionWorkflow from "@/components/shared/CreateCollectionWorkflow";

export default function AccountPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [hasCollection, setHasCollection] = useState(false);

  // Get artist collection address
  const { data: collectionAddress } = useReadContract({
    address: FACTORY_CONTRACT_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getArtistCollections",
    args: [address || "0x0000000000000000000000000000000000000000"],
    enabled: !!address,
  });

  // Get artist info
  const { data: artistInfo } = useReadContract({
    address: FACTORY_CONTRACT_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getArtistInfo",
    args: [address || "0x0000000000000000000000000000000000000000"],
    enabled: !!address,
  });

  const [artistName, musicStyles, deploymentDate, isRegistered] =
    artistInfo || [];

  // Check if artist has a collection
  useEffect(() => {
    if (
      collectionAddress &&
      collectionAddress !== "0x0000000000000000000000000000000000000000"
    ) {
      setHasCollection(true);
    } else {
      setHasCollection(false);
    }
  }, [collectionAddress]);

  // Handle navigation based on connection and registration status
  useEffect(() => {
    if (!isConnected) {
      router.push("/");
      return;
    }

    if (artistInfo !== undefined && !isRegistered) {
      router.push("/");
      return;
    }
  }, [isConnected, isRegistered, artistInfo, router]);

  // Show loading state while checking registration
  if (!isConnected || !artistInfo || !isRegistered) {
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-8">
        {/* Artist Info Card */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Artist Profile</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">Name</p>
                <p className="font-medium">{artistName}</p>
              </div>
              <div>
                <p className="text-gray-600">ETH Address</p>
                <p className="font-mono text-sm">{address}</p>
              </div>
              <div>
                <p className="text-gray-600">Music Styles</p>
                <p className="font-medium">{musicStyles?.join(", ")}</p>
              </div>
              <div>
                <p className="text-gray-600">Registration Date</p>
                <p className="font-medium">
                  {deploymentDate
                    ? new Date(
                        Number(deploymentDate) * 1000
                      ).toLocaleDateString()
                    : "Not available"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Collection Info Card */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Collection Details</h2>
          {hasCollection ? (
            <div className="space-y-3">
              <p className="text-gray-600">Collection Address</p>
              <p className="font-mono text-sm break-all">{collectionAddress}</p>
              {/* Add more collection details here as needed */}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-600 mb-4">
                You haven't created a collection yet.
              </p>
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-4">
                  Create New Collection
                </h2>
                <CreateCollectionWorkflow
                  registeredArtistName={artistName}
                  availableStyles={musicStyles}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
