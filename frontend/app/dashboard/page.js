"use client";

import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import CreateCollectionModal from "@/components/shared/CreateCollectionModal";
import { FACTORY_CONTRACT_ADDRESS, FACTORY_ABI } from "@/constants";

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  const handleCreateClick = () => {
    if (!isConnected) {
      toast({
        title: "Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!isRegistered) {
      toast({
        title: "Artist Not Registered",
        description:
          "Please register as an artist before creating a collection",
        variant: "destructive",
      });
      return;
    }

    setShowCreateModal(true);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Artist Dashboard</h1>
        <Button onClick={handleCreateClick}>Create New Collection</Button>
      </div>

      {/* Artist Info Section */}
      {isRegistered && (
        <div className="bg-white rounded-lg p-6 shadow-sm mb-8">
          <h2 className="text-xl font-semibold mb-4">Artist Profile</h2>
          <div className="space-y-2">
            <p>
              <span className="font-medium">Name:</span> {artistName}
            </p>
            <p>
              <span className="font-medium">Styles:</span>{" "}
              {musicStyles?.join(", ")}
            </p>
            <p>
              <span className="font-medium">Registered:</span>{" "}
              {new Date(Number(deploymentDate) * 1000).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      {/* Collections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Your collections will be mapped here */}
      </div>

      {/* Create Collection Modal */}
      <CreateCollectionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        registeredArtistName={artistName}
        availableStyles={musicStyles}
      />
    </div>
  );
}
