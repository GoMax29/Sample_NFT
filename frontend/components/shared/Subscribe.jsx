"use client";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { FACTORY_CONTRACT_ADDRESS, FACTORY_ABI } from "@/constants";
import debounce from "lodash/debounce";
import { CheckCircle, XCircle } from "lucide-react"; // Import icons
import MusicStyleSelector from "@/components/shared/MusicStyleSelector";
import { ExternalLink } from "lucide-react"; // Import icon for external link
import { useRouter } from "next/navigation";

const Subscribe = ({ isOpen, onClose, onSuccess }) => {
  const { address } = useAccount();
  const [artistName, setArtistName] = useState("");
  const [selectedStyles, setSelectedStyles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNameAvailable, setIsNameAvailable] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Contract write hooks
  const {
    data: hash,
    error,
    isPending: setIsPending,
    writeContract,
    isError: isWriteError,
    error: writeError,
  } = useWriteContract();

  // Transaction confirmation hook
  const {
    isLoading: isConfirming,
    isSuccess, // Make sure this is destructured
    error: errorConfirmation,
  } = useWaitForTransactionReceipt({
    hash,
  });

  // Use the mapping getter instead of a custom function
  const { data: isNameTaken, refetch: checkName } = useReadContract({
    address: FACTORY_CONTRACT_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "artistNameTaken",
    args: [artistName],
    enabled: false, // We'll manually trigger this
  });

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

  // Debounced function to check name availability
  useEffect(() => {
    const checkNameAvailability = debounce(async () => {
      if (artistName.length > 0) {
        setIsChecking(true);
        try {
          const { data } = await checkName();
          setIsNameAvailable(!data);
        } catch (error) {
          console.error("Error checking name availability:", error);
          setIsNameAvailable(null);
        } finally {
          setIsChecking(false);
        }
      } else {
        setIsNameAvailable(null);
      }
    }, 500);

    checkNameAvailability();

    return () => {
      checkNameAvailability.cancel();
    };
  }, [artistName, checkName]);

  const handleStyleToggle = (style) => {
    setSelectedStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  };

  // Handle successful transaction
  useEffect(() => {
    if (isSuccess && hash) {
      const truncatedAddress = `${address?.slice(0, 6)}...${address?.slice(
        -4
      )}`;
      const etherscanLink = `https://sepolia.etherscan.io/tx/${hash}`; // Adjust network as needed

      toast({
        title: "Artist Registration Successful! 🎉",
        description: (
          <div className="space-y-2">
            <p>
              Artist: <span className="font-medium">{artistName}</span>
            </p>
            <p>
              Address: <span className="font-mono">{truncatedAddress}</span>
            </p>
            <a
              href={etherscanLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-blue-500 hover:text-blue-600"
            >
              View on Etherscan <ExternalLink className="ml-1 h-4 w-4" />
            </a>
          </div>
        ),
        duration: 10000, // Longer duration for success message
        variant: "success",
      });

      onSuccess?.();
      onClose();
    }
  }, [isSuccess, hash, artistName, address, onSuccess, onClose, toast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await writeContract({
        address: FACTORY_CONTRACT_ADDRESS,
        abi: FACTORY_ABI,
        functionName: "deployArtistClonedCollections",
        args: [artistName, selectedStyles],
      });

      // Show pending toast
      toast({
        title: "Transaction Pending",
        description: "Please wait while your transaction is being processed...",
        variant: "default",
      });
    } catch (error) {
      let errorMessage = "Failed to register artist";

      if (error.message.includes("user rejected")) {
        errorMessage = "Transaction was rejected";
      } else if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for transaction";
      }

      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    // Clear any existing toasts when closing the modal
    if (toast.clear) {
      toast.clear(); // Use the correct method based on your toast library
    }
    onClose();
    router.replace("/");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Register as an Artist</DialogTitle>
          <DialogDescription>
            Complete your artist profile to start creating music collections
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Artist Name</label>
              <div className="relative">
                <Input
                  type="text"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  placeholder="Enter your artist name"
                  className="mt-1 pr-10" // Add padding for the icon
                  required
                  disabled={isSubmitting}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  {isChecking ? (
                    <div className="animate-spin h-5 w-5 border-2 border-gray-500 rounded-full border-t-transparent" />
                  ) : (
                    artistName &&
                    (isNameAvailable ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ))
                  )}
                </div>
              </div>
              {/* Name availability message */}
              {artistName && !isChecking && (
                <p
                  className={`text-sm mt-1 ${
                    isNameAvailable ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {isNameAvailable
                    ? "Artist name is available"
                    : "This artist name is already taken"}
                </p>
              )}
            </div>

            <MusicStyleSelector
              onChange={setSelectedStyles}
              multiSelect={true}
              disabled={isSubmitting}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={
              isSubmitting || !artistName || selectedStyles.length === 0
            }
          >
            {isSubmitting ? "Registering..." : "Register"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default Subscribe;
