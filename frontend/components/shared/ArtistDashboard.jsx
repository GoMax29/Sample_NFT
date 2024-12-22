"use client";
import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { FACTORY_CONTRACT_ADDRESS, FACTORY_ABI } from "@/constants";

const ArtistDashboard = () => {
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

  // Destructure artistInfo array
  const [name, musicStyles, deploymentDate, isRegistered] = artistInfo || [];

  // Check if artist has a collection when component mounts or address changes
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

  // If wallet is not connected
  if (!isConnected) {
    return (
      <div className="p-6 max-w-2xl mx-auto bg-white rounded-xl shadow-lg">
        <p className="text-gray-600">
          Please connect your wallet to view your artist dashboard
        </p>
      </div>
    );
  }

  // Function to safely stringify BigInt values
  const safeStringify = (data) => {
    return JSON.stringify(data, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    );
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-xl shadow-lg space-y-4">
      {hasCollection ? (
        <>
          <h1 className="text-2xl font-bold text-gray-900">
            Hello {name || "Artist"}!
          </h1>
          <div className="space-y-2">
            <p className="text-gray-600">
              Your ETH Address:{" "}
              <span className="font-mono text-gray-900">{address}</span>
            </p>
            <p className="text-gray-600">
              Your Collection Address:{" "}
              <span className="font-mono text-gray-900">
                {collectionAddress}
              </span>
            </p>
            <p className="text-gray-600">
              Music Styles:{" "}
              <span className="text-gray-900">
                {musicStyles?.join(", ") || "No styles specified"}
              </span>
            </p>
            <p className="text-gray-600">
              Registration Date:{" "}
              <span className="text-gray-900">
                {deploymentDate
                  ? new Date(Number(deploymentDate) * 1000).toLocaleDateString()
                  : "Not available"}
              </span>
            </p>
            <p className="text-gray-600">
              Registration Status:{" "}
              <span className="text-gray-900">
                {isRegistered ? "Registered" : "Not Registered"}
              </span>
            </p>
          </div>
        </>
      ) : (
        <div className="text-center">
          <p className="text-gray-600">You haven't created a collection yet.</p>
          <button
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            onClick={() => (window.location.href = "/create-collection")}
          >
            Create Your First Collection
          </button>
        </div>
      )}

      {/* Debug Information */}
      <div className="mt-8 p-4 bg-gray-100 rounded-md text-sm">
        <h3 className="font-bold mb-2">Debug Information:</h3>
        <pre className="whitespace-pre-wrap">
          {safeStringify({
            address,
            collectionAddress,
            artistInfo: {
              name,
              musicStyles,
              deploymentDate,
              isRegistered,
            },
            hasCollection,
          })}
        </pre>
      </div>
    </div>
  );
};

export default ArtistDashboard;
