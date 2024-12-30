"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract, useBalance } from "wagmi";
import ProfileDropdown from "./ProfileDropdown";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { FACTORY_CONTRACT_ADDRESS, FACTORY_ABI } from "@/constants";
import { useState, useEffect } from "react";
import SubscribeModal from "@/components/shared/SubscribeModal";
import ClientOnly from "./ClientOnly";
import Image from "next/image";

const Header = () => {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const router = useRouter();
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [artistName, setArtistName] = useState("Unknown Artist");

  const { data: balance } = useBalance({
    address,
  });

  const {
    data: artistInfo,
    isError,
    isLoading,
    error,
  } = useReadContract({
    address: FACTORY_CONTRACT_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getArtistInfo",
    args: [address],
    enabled: Boolean(address) && isConnected && address !== "0x",
    chainId: 84532,
  });

  useEffect(() => {
    if (isError && isConnected) {
      console.error("Contract read error:", error?.message || "Unknown error");
      toast({
        title: "Error",
        description: "Failed to load artist information",
        variant: "destructive",
      });
    }
  }, [isError, error, isConnected]);

  useEffect(() => {
    if (!isLoading && artistInfo) {
      try {
        let name, musicStyles, deploymentDate, isRegistered;

        if (Array.isArray(artistInfo)) {
          [name, musicStyles, deploymentDate, isRegistered] = artistInfo;
        } else {
          ({ name, musicStyles, deploymentDate, isRegistered } = artistInfo);
        }

        if (isRegistered) {
          setIsRegistered(true);
          setArtistName(name || "Unknown Artist");
        }
      } catch (err) {
        console.error("Error parsing artist info:", err);
      }
    }
  }, [artistInfo, isLoading]);

  useEffect(() => {
    if (!isConnected) {
      setIsRegistered(false);
      setArtistName("Unknown Artist");
    }
  }, [isConnected]);

  useEffect(() => {
    if (isConnected) {
      console.log({
        contractAddress: FACTORY_CONTRACT_ADDRESS,
        walletAddress: address,
        isConnected,
        isLoading,
        isError,
        artistInfo,
      });
    }
  }, [address, isConnected, isLoading, isError, artistInfo]);

  const handleCreateMusic = () => {
    if (!isConnected) {
      toast({
        title: "Please connect wallet to begin",
        className: "bg-green-500 text-white",
      });
      return;
    }
    router.push("/create-music");
  };

  const handleSubmitSamples = () => {
    if (!isConnected) {
      toast({
        title: "Please connect wallet to begin",
        className: "bg-[#F7931A] text-white", // Bitcoin orange
      });
      return;
    }

    if (!isRegistered) {
      setShowSubscribeModal(true);
    } else {
      router.push("/CreateNewCollection");
    }
  };

  return (
    <ClientOnly>
      <header className="w-full bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-xl font-bold">
                <Image
                  src="/Nifty Sample mini Logo jpeg.jpg"
                  alt="Nifty Sample mini Logo"
                  width={60}
                  height={60}
                  priority
                />
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                onClick={handleCreateMusic}
                className="bg-green-500 hover:bg-green-600 text-black font-bold"
              >
                Create Music
              </Button>

              <Button
                onClick={handleSubmitSamples}
                className="bg-[#F7931A] hover:bg-[#E87F15] text-black font-bold relative group"
              >
                {isConnected ? (
                  <>
                    Submit Samples
                    {/* Hover tooltip for unregistered users */}
                    {!isRegistered && (
                      <ClientOnly>
                        <span className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#F7931A] text-black px-2 py-1 rounded text-sm whitespace-nowrap">
                          Register to Submit
                        </span>
                      </ClientOnly>
                    )}
                  </>
                ) : (
                  "Submit Samples"
                )}
              </Button>

              {!isConnected ? (
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
                          {address &&
                            `${address.slice(0, 6)}...${address.slice(-4)}`}
                        </span>
                      </div>
                    </Button>
                  </ProfileDropdown>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="border-b border-gray-200" /> {/* Thin separator line */}
      </header>

      {showSubscribeModal && (
        <SubscribeModal onClose={() => setShowSubscribeModal(false)} />
      )}
    </ClientOnly>
  );
};

export default Header;
