"use client";
import { useState, useEffect } from "react";

import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  FACTORY_CONTRACT_ADDRESS,
  FACTORY_ABI,
  TREASURY_CONTRACT_ADDRESS,
  TREASURY_ABI,
  ARTIST_COLLECTIONS_ABI,
  ARTIST_COLLECTIONS_IMPL_ADDRESS,
} from "@/constants";

import {
  useReadContract,
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";

import { parseAbiItem } from "viem";

import { publicClient } from "@/utils/client";

import Event from "./Event";
import MusicStyleSelector from "./MusicStyleSelector";

const Subscribe = () => {
  const { address, chain } = useAccount();

  const [artistName, setArtistName] = useState("");
  const [musicStyles, setMusicStyles] = useState([]);
  const [events, setEvents] = useState([]);
  const [deployedAddress, setDeployedAddress] = useState(null);
  const [deploymentLogs, setDeploymentLogs] = useState([]);

  const { toast } = useToast();

  const {
    data: cloneAddress,
    error: getError,
    isPending: getIsPending,
    refetch,
  } = useWriteContract({
    address: FACTORY_CONTRACT_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "deployArtistClonedCollections",
    args: [artistName, musicStyles],
    account: address,
  });

  const {
    data: hash,
    error,
    isPending: setIsPending,
    writeContract,
  } = useWriteContract({
    mutation: {
      // onSuccess: () => {
      // },
      // onError: (error) => {
      // }
    },
  });

  const {
    isLoading: isConfirming,
    isSuccess,
    error: errorConfirmation,
  } = useWaitForTransactionReceipt({
    hash,
  });

  const refetchEverything = async () => {
    await refetch();
    await getEvents();
  };

  const deployArtist = async () => {
    try {
      console.log("Deploying artist with:", {
        address: FACTORY_CONTRACT_ADDRESS,
        artistName,
        musicStyles,
        userAddress: address,
      });

      await writeContract({
        address: FACTORY_CONTRACT_ADDRESS,
        abi: FACTORY_ABI,
        functionName: "deployArtistClonedCollections",
        args: [artistName, musicStyles],
        account: address,
      });
    } catch (error) {
      console.error("Error deploying artist:", error);
      toast({
        title: "Deployment failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getEvents = async () => {
    const artistDeployedLog = await publicClient.getLogs({
      address: FACTORY_CONTRACT_ADDRESS,
      event: parseAbiItem(
        "event ArtistCollectionsDeployed(address indexed artist, address indexed collectionsContract)"
      ),
      fromBlock: 0n,
      toBlock: "latest",
    });

    const formattedLogs = artistDeployedLog.map((log) => ({
      artist: log.args.artist,
      collectionsContract: log.args.collectionsContract,
    }));

    setDeploymentLogs(formattedLogs);

    if (formattedLogs.length > 0) {
      const mostRecent = formattedLogs[formattedLogs.length - 1];
      setDeployedAddress(mostRecent.collectionsContract);
    }
  };

  useEffect(() => {
    if (isSuccess) {
      toast({
        title: "Congratulations",
        description: "Your collection has been deployed",
        className: "bg-lime-200",
      });
      location.reload();
      getEvents();
    }
    if (errorConfirmation) {
      toast({
        title: errorConfirmation.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  }, [isSuccess, errorConfirmation]);

  // Lorsque l'on a qqn qui est connecté, on fetch les events
  // useEffect(() => {
  //   const getAllEvents = async () => {
  //     if (address !== "undefined") {
  //       await getEvents();
  //     }
  //   };
  //   getAllEvents();
  // }, [address]);

  useEffect(() => {
    console.log("Contract addresses:", {
      factory: FACTORY_CONTRACT_ADDRESS,
      treasury: TREASURY_CONTRACT_ADDRESS,
      implementation: ARTIST_COLLECTIONS_IMPL_ADDRESS,
    });
  }, []);

  useEffect(() => {
    console.log("Connected to chain:", chain);
    if (chain?.id !== 31337) {
      toast({
        title: "Wrong network",
        description: "Please connect to localhost network (Chain ID: 31337)",
        variant: "destructive",
      });
    }
  }, [chain]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input
          placeholder="Your name"
          onChange={(e) => setArtistName(e.target.value)}
        />
        <MusicStyleSelector setMusicStyles={setMusicStyles} />
        <Button
          variant="outline"
          disabled={setIsPending}
          onClick={deployArtist}
        >
          {setIsPending ? "Setting..." : "Set"}
        </Button>
      </div>

      {deployedAddress && (
        <div className="mt-4 p-4 border rounded-lg">
          <h3 className="text-lg font-semibold">Your Collection Address:</h3>
          <p className="font-mono break-all">{deployedAddress}</p>
        </div>
      )}

      {deploymentLogs.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Deployment History:</h3>
          <div className="space-y-2">
            {deploymentLogs.map((log, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <p>
                  <strong>Artist:</strong>{" "}
                  <span className="font-mono">{log.artist}</span>
                </p>
                <p>
                  <strong>Collection:</strong>{" "}
                  <span className="font-mono">{log.collectionsContract}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscribe;
