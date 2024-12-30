"use client";

import { useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { useRouter } from "next/navigation";
import { FACTORY_CONTRACT_ADDRESS, FACTORY_ABI } from "@/constants";
import CreateCollectionWorkflow from "@/components/shared/CreateCollectionWorkflow";
import { useToast } from "@/hooks/use-toast";
import "../globals.css";
export default function CreateCollectionPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  // Get artist info
  const { data: artistInfo } = useReadContract({
    address: FACTORY_CONTRACT_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getArtistInfo",
    args: [address || "0x0000000000000000000000000000000000000000"],
    enabled: !!address,
  });

  const [artistName, musicStyles, , isRegistered] = artistInfo || [];

  // Handle navigation based on connection and registration status
  useEffect(() => {
    if (!isConnected || (artistInfo !== undefined && !isRegistered)) {
      router.push("/");
    }
  }, [isConnected, isRegistered, artistInfo, router]);

  if (!isConnected || !artistInfo || !isRegistered) {
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Create New Collection</h1>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <CreateCollectionWorkflow
            registeredArtistName={artistName}
            availableStyles={musicStyles}
          />
        </div>
      </div>
    </div>
  );
}
