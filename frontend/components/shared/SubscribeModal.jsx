"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { FACTORY_CONTRACT_ADDRESS, FACTORY_ABI } from "@/constants";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

const SubscribeModal = ({ onClose, onSuccess }) => {
  const [artistName, setArtistName] = useState("");
  const [selectedStyles, setSelectedStyles] = useState([]);
  const { toast } = useToast();
  const router = useRouter();
  const { address } = useAccount();

  const { writeContract, data: hash } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (isSuccess) {
      toast({
        title: "Registration Successful",
        description: "You are now registered as an artist!",
      });
      onSuccess?.(artistName);
      onClose();
      router.refresh();
    }
  }, [isSuccess, artistName, onSuccess, onClose, router, toast]);

  const musicStyles = [
    "Pop",
    "Rock",
    "Jazz",
    "Classical",
    "Electronic",
    "Hip Hop",
    "R&B",
    "Country",
    "Folk",
    "Metal",
  ];

  const handleRegister = async () => {
    try {
      if (!artistName || selectedStyles.length === 0) {
        toast({
          title: "Missing Information",
          description: "Please fill in all fields",
          variant: "destructive",
        });
        return;
      }

      console.log("Initiating transaction...");
      writeContract({
        address: FACTORY_CONTRACT_ADDRESS,
        abi: FACTORY_ABI,
        functionName: "registerArtist",
        args: [artistName, selectedStyles],
      });

      toast({
        title: "Transaction Pending",
        description: "Please wait while your transaction is being processed...",
      });

      if (isSuccess) {
        toast({
          title: "Registration Successful",
          description: "You are now registered as an artist!",
        });
        onClose();
        router.refresh();
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Register as an Artist</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Artist Name
            </label>
            <input
              type="text"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Enter your artist name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Music Styles
            </label>
            <div className="grid grid-cols-2 gap-2">
              {musicStyles.map((style) => (
                <button
                  key={style}
                  onClick={() =>
                    setSelectedStyles((prev) =>
                      prev.includes(style)
                        ? prev.filter((s) => s !== style)
                        : [...prev, style]
                    )
                  }
                  className={`p-2 text-sm rounded-md ${
                    selectedStyles.includes(style)
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleRegister}
            disabled={isConfirming}
            className={`w-full bg-indigo-600 text-white rounded-md py-2 hover:bg-indigo-700 transition-colors ${
              isConfirming ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isConfirming ? "Registering..." : "Register"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscribeModal;
