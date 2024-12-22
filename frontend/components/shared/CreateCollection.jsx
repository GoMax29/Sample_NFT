"use client";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useReadContract,
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  FACTORY_CONTRACT_ADDRESS,
  FACTORY_ABI,
  ARTIST_COLLECTIONS_IMPL_ADDRESS,
  ARTIST_COLLECTIONS_ABI,
} from "@/constants";

const CreateCollection = () => {
  const { address } = useAccount();
  const { toast } = useToast();
  const [collectionName, setCollectionName] = useState("");
  const [collectionStyle, setCollectionStyle] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const defaultAvatarIPFS =
    "https://amethyst-worrying-squid-449.mypinata.cloud/ipfs/bafkreidg2lqvm5lolzodu2qyctirhcdymdhucp276scaoioccznkokfsae";

  const { data: collectionAddress, error } = useReadContract({
    address: FACTORY_CONTRACT_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getArtistCollections",
    args: [address || "0x0000000000000000000000000000000000000000"],
  });

  const {
    data: hash,
    error: writeError,
    isPending: writePending,
    writeContract,
  } = useWriteContract({});

  const deployCollection = async () => {
    if (!collectionName || !collectionStyle || !collectionDescription) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsPending(true);
    try {
      await writeContract({
        address: collectionAddress,
        abi: ARTIST_COLLECTIONS_ABI,
        functionName: "createCollection",
        args: [
          collectionName,
          collectionStyle,
          collectionDescription,
          isPublic,
          defaultAvatarIPFS,
        ],
      });

      toast({
        title: "Collection created successfully!",
        description: `Collection "${collectionName}" has been created`,
        variant: "success",
      });

      setCollectionName("");
      setCollectionStyle("");
      setCollectionDescription("");
      setIsPublic(false);
    } catch (error) {
      console.error("Error creating collection:", error);
      toast({
        title: "Creation failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  if (!address) {
    return <div>Error: Artist address is not defined.</div>;
  }

  if (error) {
    console.error("Error fetching collection address:", error);
    return <div>Error fetching collection address.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Artist Collection Address:</h3>
        <p className="text-sm text-gray-500">
          {collectionAddress || "No collection found"}
        </p>
      </div>
      <div className="space-y-4">
        <Input
          placeholder="Collection Name"
          value={collectionName}
          onChange={(e) => setCollectionName(e.target.value)}
        />
        <Input
          placeholder="Collection Style"
          value={collectionStyle}
          onChange={(e) => setCollectionStyle(e.target.value)}
        />
        <Input
          placeholder="Collection Description"
          value={collectionDescription}
          onChange={(e) => setCollectionDescription(e.target.value)}
        />
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isPublic"
            checked={isPublic}
            onCheckedChange={(checked) => setIsPublic(checked)}
          />
          <label
            htmlFor="isPublic"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Make collection public in marketplace
          </label>
        </div>
        <Button
          className="w-full"
          variant="outline"
          disabled={isPending}
          onClick={deployCollection}
        >
          {isPending ? "Creating..." : "Create Collection"}
        </Button>
      </div>
    </div>
  );
};

export default CreateCollection;
