"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract, useBalance } from "wagmi";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import ProfileDropdown from "@/components/shared/ProfileDropdown";
import { FACTORY_CONTRACT_ADDRESS, FACTORY_ABI } from "@/constants";

const Header = () => {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({
    address,
  });

  const { data: artistInfo } = useReadContract({
    address: FACTORY_CONTRACT_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getArtistInfo",
    args: [address || "0x0000000000000000000000000000000000000000"],
    enabled: !!address,
  });

  const [artistName, , , isRegistered] = artistInfo || [];

  const truncateAddress = (addr) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link href="/" className="text-xl font-bold">
            Sonic NFT
          </Link>
        </div>

        <div className="flex items-center space-x-2">
          {!isConnected ? (
            <>
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={openConnectModal}
                    >
                      <Wallet className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={openConnectModal}
                      className="flex items-center space-x-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-full px-4 py-2"
                    >
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        ?
                      </div>
                      <span className="text-sm">Connect Wallet</span>
                    </Button>
                  </>
                )}
              </ConnectButton.Custom>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Wallet className="h-4 w-4" />
                  <span className="text-sm">
                    {balance?.formatted.slice(0, 6)} ETH
                  </span>
                </Button>
              </div>
              <ProfileDropdown
                isRegistered={isRegistered}
                artistName={artistName}
                address={address}
              >
                <Button
                  variant="outline"
                  className="flex items-center space-x-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-full px-4 py-2"
                >
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    {isRegistered ? artistName?.[0].toUpperCase() : "?"}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">
                      {isRegistered ? artistName : "Unknown Artist"}
                    </span>
                    <span className="text-xs text-gray-500">
                      {truncateAddress(address)}
                    </span>
                  </div>
                </Button>
              </ProfileDropdown>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
