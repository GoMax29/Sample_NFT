"use client";

import { useAccount, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { FACTORY_CONTRACT_ADDRESS, FACTORY_ABI } from "@/constants";

const UserButton = () => {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  const { data: artistInfo } = useReadContract({
    address: FACTORY_CONTRACT_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getArtistInfo",
    args: [address || "0x0000000000000000000000000000000000000000"],
    enabled: !!address,
  });

  const [artistName, , , isRegistered] = artistInfo || [];

  if (!isConnected) {
    return <ConnectButton />;
  }

  const truncatedAddress = `${address?.slice(0, 6)}...${address?.slice(-4)}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          {isRegistered ? (
            <>
              {artistName} ({truncatedAddress})
            </>
          ) : (
            truncatedAddress
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isRegistered && (
          <DropdownMenuItem onClick={() => router.push("/dashboard")}>
            Dashboard
          </DropdownMenuItem>
        )}
        {/* Add other menu items as needed */}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserButton;
