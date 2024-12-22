"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAccount, useReadContract } from "wagmi";
import { FACTORY_CONTRACT_ADDRESS, FACTORY_ABI } from "@/constants";
import { useToast } from "@/hooks/use-toast";

const CreateCollectionButton = () => {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { toast } = useToast();

  const { data: artistInfo } = useReadContract({
    address: FACTORY_CONTRACT_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getArtistInfo",
    args: [address || "0x0000000000000000000000000000000000000000"],
    enabled: !!address,
  });

  const [, , , isRegistered] = artistInfo || [];

  const handleClick = () => {
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

    router.push("/CreateNewCollection");
  };

  return <Button onClick={handleClick}>Go to Create New Collection</Button>;
};

export default CreateCollectionButton;
