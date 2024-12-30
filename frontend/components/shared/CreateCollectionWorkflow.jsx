"use client";
import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { PinataSDK } from "pinata-web3";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useReadContract,
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useWaitForTransaction,
} from "wagmi";
import { parseEther } from "viem";
import { decodeEventLog } from "viem";
import { useRouter } from "next/navigation";

import {
  FACTORY_CONTRACT_ADDRESS,
  FACTORY_ABI,
  ARTIST_COLLECTIONS_IMPL_ADDRESS,
  ARTIST_COLLECTIONS_ABI,
} from "@/constants";

import Link from "next/link";
import MusicStyleSelector from "./MusicStyleSelector";
import debounce from "lodash/debounce";
import { CheckCircle, XCircle } from "lucide-react";
import { Loader2 } from "lucide-react";

const CreateCollectionWorkflow = () => {
  const [collectionName, setCollectionName] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("");
  const [isNameAvailable, setIsNameAvailable] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [pinata, setPinata] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadedCIDs, setUploadedCIDs] = useState([]);
  const [baseURI, setBaseURI] = useState("");
  const [tokenPrice, setTokenPrice] = useState("");
  const [localArtistName, setLocalArtistName] = useState("");
  const [collectionData, setCollectionData] = useState({
    name: "",
    style: "",
    description: "",
    isPublic: false,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [pendingBatchCreation, setPendingBatchCreation] = useState(false);
  const [currentCollectionId, setCurrentCollectionId] = useState(null);
  const [isPublic, setIsPublic] = useState(false);

  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const router = useRouter();

  const {
    data: hash,
    error: writeError,
    isPending: writePending,
    writeContract,
  } = useWriteContract();

  const { isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const {
    data: artistInfo,
    error: artistInfoError,
    refetch: refetchArtistInfo,
  } = useReadContract({
    address: FACTORY_CONTRACT_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getArtistInfo",
    args: [address || "0x0000000000000000000000000000000000000000"],
    enabled: !!address,
  });

  const {
    data: collectionAddress,
    error: addressError,
    refetch: refetchCollectionAddress,
  } = useReadContract({
    address: FACTORY_CONTRACT_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getArtistCollections",
    args: [address || "0x0000000000000000000000000000000000000000"],
    enabled: !!address,
  });

  const {
    data: collectionCounterData,
    error: collectionIdError,
    refetch: refetchCollectionCounter,
  } = useReadContract({
    address:
      collectionAddress &&
      collectionAddress !== "0x0000000000000000000000000000000000000000"
        ? collectionAddress
        : undefined,
    abi: ARTIST_COLLECTIONS_ABI,
    functionName: "collectionCounter",
    enabled:
      !!collectionAddress &&
      collectionAddress !== "0x0000000000000000000000000000000000000000",
  });

  useEffect(() => {
    if (isSuccess && receipt) {
      console.log("Transaction successful:", { hash, receipt });
      refetchCollectionAddress();
      refetchCollectionCounter();
      refetchArtistInfo();
      toast({
        title: "Collection Created",
        description: "Your collection has been created successfully!",
        variant: "success",
      });
    }
  }, [isSuccess, receipt]);

  // Destructure artistInfo array
  const [artistName, musicStyles, deploymentDate, isRegistered] =
    artistInfo || [];

  // Function to truncate address for display
  const truncateAddress = (addr) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Modify the effect to handle undefined artistInfo
  useEffect(() => {
    if (!address) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to continue",
        variant: "warning",
      });
      return;
    }

    //   // Check if address exists and artistInfo has been fetched
    // if (address && artistInfo) {
    //   if (!artistInfo.isRegistered) {
    //     toast({
    //       title: "Artist Not Registered",
    //       description:
    //         "Please register as an artist before creating a collection",
    //       variant: "warning",
    //     });
    //   }
    // }
  }, [address, toast, artistInfo]); // Include artistInfo in dependency array

  // Debug effect to log artistInfo
  useEffect(() => {
    console.log("Artist Info:", artistInfo);
    if (artistInfoError) {
      console.error("Artist Info Error:", artistInfoError);
    }
  }, [artistInfo, artistInfoError]);

  // Initialize Pinata when component mounts
  useEffect(() => {
    const jwt = process.env.NEXT_PUBLIC_PINATA_JWT;
    const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY;

    console.log("JWT:", jwt);
    console.log("Gateway:", gateway);

    if (!jwt || !gateway) {
      console.error("Pinata credentials not found!");
      return;
    }

    const pinataInstance = new PinataSDK({
      pinataJwt: jwt,
      pinataGateway: gateway,
    });

    setPinata(pinataInstance);
  }, []);

  // Handle collection data changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCollectionData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const defaultAvatarIPFS =
    "https://amethyst-worrying-squid-449.mypinata.cloud/ipfs/bafkreifm4jaawnsvrgh3vxivalkypwmic5a2rq4rf7ryljw5su2mrmgyam";

  // File upload handling with updated metadata
  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (!isRegistered) {
        toast({
          title: "Artist Not Registered",
          description: "Please register as an artist before uploading files",
          variant: "destructive",
        });
        return;
      }

      setIsUploading(true);
      const uploadedCIDs = [];

      try {
        const currentArtistName =
          artistName || localArtistName || "Unknown Artist";
        const collectionIdValue = collectionCounterData
          ? (parseInt(collectionCounterData.toString(), 10) + 1).toString()
          : "1";

        for (let i = 0; i < acceptedFiles.length; i++) {
          const file = acceptedFiles[i];

          // New upload handling
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          const result = await response.json();
          const fileUpload = { IpfsHash: result.IpfsHash };

          // Update metadata to use collectionName and selectedStyle
          const metadata = {
            artist: {
              name: currentArtistName,
              address: address || "0x0000000000000000000000000000000000000000",
            },
            collection: {
              id: collectionIdValue,
              name: collectionName || "Unnamed Collection",
              description: collectionData.description,
              style: selectedStyle || "",
            },
            token: {
              id: `#${i + 1}`,
              name: file.name,
              price: tokenPrice,
              sample: `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${fileUpload.IpfsHash}`,
            },
            image: defaultAvatarIPFS,
          };

          // Upload metadata
          const metadataFormData = new FormData();
          const metadataBlob = new Blob([JSON.stringify(metadata)], {
            type: "application/json",
          });
          metadataFormData.append("file", metadataBlob, "metadata.json");

          const metadataResponse = await fetch("/api/upload", {
            method: "POST",
            body: metadataFormData,
          });

          const metadataResult = await metadataResponse.json();
          uploadedCIDs.push(metadataResult.IpfsHash);
        }

        // Update collection metadata
        const collectionMetadata = {
          name: collectionName || "Unnamed Collection",
          description: collectionData.description,
          style: selectedStyle || "",
          artist: {
            name: currentArtistName,
            address: address,
          },
          tokenPrice: tokenPrice,
          tokens: uploadedCIDs.map((cid, index) => ({
            id: index + 1,
            uri: `ipfs://${cid}`,
            name: acceptedFiles[index].name,
          })),
        };

        const collectionFormData = new FormData();
        const collectionBlob = new Blob([JSON.stringify(collectionMetadata)], {
          type: "application/json",
        });
        collectionFormData.append("file", collectionBlob, "collection.json");

        const collectionResponse = await fetch("/api/upload", {
          method: "POST",
          body: collectionFormData,
        });

        const collectionResult = await collectionResponse.json();
        setBaseURI(`ipfs://${collectionResult.IpfsHash}/`);
        setUploadedCIDs(uploadedCIDs);
        setUploadedFiles(acceptedFiles);

        toast({
          title: "Files uploaded successfully",
          description: `Uploaded ${acceptedFiles.length} files to IPFS`,
          variant: "success",
        });
      } catch (error) {
        console.error("Upload error:", error);
        toast({
          title: "Upload failed",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    },
    [
      isRegistered,
      artistName,
      localArtistName,
      collectionCounterData,
      address,
      collectionName,
      collectionData.description,
      selectedStyle,
      tokenPrice,
      toast,
    ]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  // Deploy collection using the logic from CreateCollection.jsx
  const deployCollection = async () => {
    if (
      !collectionData.name ||
      !collectionData.style ||
      !collectionData.description
    ) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // setIsPending(true);
    try {
      await writeContract({
        address: collectionAddress,
        abi: ARTIST_COLLECTIONS_ABI,
        functionName: "createCollection",
        args: [
          collectionData.name,
          collectionData.style,
          collectionData.description,
          isPublic,
          defaultAvatarIPFS,
        ],
      });

      toast({
        title: "Collection created successfully!",
        description: `Collection "${collectionData.name}" has been created`,
        variant: "success",
      });

      // Reset form
      setCollectionData({
        name: "",
        style: "",
        description: "",
        isPublic: false,
      });
      setTokenPrice("");
      setUploadedFiles([]);
      setUploadedCIDs([]);
      setBaseURI("");
    } catch (error) {
      console.error("Deployment error:", error);
      toast({
        title: "Deployment failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Function to handle fetching artist name
  const handleFetchArtistName = () => {
    if (artistInfo) {
      setLocalArtistName(artistInfo.name || "Unknown Artist");
    } else {
      console.error("Artist info not available");
    }
  };

  // Function to safely stringify BigInt values
  const safeStringify = (data) => {
    return JSON.stringify(data, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    );
  };

  // Check if collection name is taken
  const { data: isNameTaken, refetch: checkName } = useReadContract({
    address: FACTORY_CONTRACT_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "collectionNameTaken",
    args: [collectionName],
    enabled: false,
  });

  // Debounced function to check name availability
  useEffect(() => {
    const checkNameAvailability = debounce(async () => {
      if (collectionName.length > 0) {
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
  }, [collectionName, checkName]);

  // Move useEffect to component level
  useEffect(() => {
    const createBatchTokens = async () => {
      if (isSuccess && receipt && pendingBatchCreation && currentCollectionId) {
        console.log("Collection created, starting batch token creation...");
        console.log("Using collection ID:", currentCollectionId);

        try {
          const prices = new Array(uploadedCIDs.length).fill(
            parseEther(tokenPrice)
          );
          const tokenURIs = uploadedCIDs.map((cid) => `ipfs://${cid}`);

          await writeContract({
            address: collectionAddress,
            abi: ARTIST_COLLECTIONS_ABI,
            functionName: "batchCreateToken",
            args: [currentCollectionId, prices, tokenURIs],
          });

          toast({
            title: "Tokens Created Successfully",
            description: `${uploadedCIDs.length} tokens created in collection "${collectionName}"`,
            variant: "success",
          });

          setPendingBatchCreation(false);
        } catch (error) {
          console.error("Error in batch token creation:", error);
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    };

    createBatchTokens();
  }, [isSuccess, receipt, pendingBatchCreation, currentCollectionId]);

  const handleCreateCollection = async () => {
    if (!uploadedCIDs.length) return;

    try {
      setIsCreating(true);
      console.log("Starting collection creation...");

      // Get collection ID that will be used
      const collectionId = collectionCounterData
        ? (parseInt(collectionCounterData.toString(), 10) + 1).toString()
        : "1";

      console.log("Using collection ID:", collectionId);
      setCurrentCollectionId(collectionId); // Store the collection ID

      // Create Collection
      const result = await writeContract({
        address: collectionAddress,
        abi: ARTIST_COLLECTIONS_ABI,
        functionName: "createCollection",
        args: [
          collectionName,
          selectedStyle,
          collectionData.description,
          isPublic,
          collectionData.avatarIPFS_URL || "",
        ],
      });

      console.log("Write contract result:", result);
      setPendingBatchCreation(true);
    } catch (error) {
      console.error("Error in collection creation:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Add this effect to track the transaction status
  useEffect(() => {
    if (writeError) {
      console.error("Write error:", writeError);
      toast({
        title: "Error",
        description: writeError.message,
        variant: "destructive",
      });
      setIsCreating(false);
    }
  }, [writeError]);

  useEffect(() => {
    if (writePending) {
      console.log("Write pending...");
    }
  }, [writePending]);

  useEffect(() => {
    if (isSuccess && receipt) {
      console.log("Transaction successful:", { hash, receipt });
      // Handle successful transaction
      refetchCollectionAddress();
      refetchCollectionCounter();
      refetchArtistInfo();
      toast({
        title: "Collection Created",
        description: "Your collection has been created successfully!",
        variant: "success",
      });
      setIsCreating(false);
    }
  }, [isSuccess, receipt]);

  const handleIsPublicChange = (checked) => {
    setIsPublic(checked);
  };

  return (
    <div className="space-y-8">
      {!pinata && (
        <div className="text-red-500">
          Warning: Pinata is not initialized. Please check your environment
          variables.
        </div>
      )}

      {!address && (
        <div className="text-yellow-500 mb-4">
          Please connect your wallet to create a collection
        </div>
      )}

      {/* Registration Warning */}
      {!isRegistered && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                You must register as an artist before creating a collection
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Collection Details Form */}
      <div className="space-y-4">
        <div className="relative">
          <Input
            placeholder="Collection Name"
            value={collectionName}
            onChange={(e) => setCollectionName(e.target.value)}
            className={`pr-10 ${
              isNameAvailable === false ? "border-red-500" : ""
            }`}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {isChecking ? (
              <div className="animate-spin h-5 w-5 border-2 border-gray-500 rounded-full border-t-transparent" />
            ) : (
              collectionName &&
              (isNameAvailable ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              ))
            )}
          </div>
        </div>

        {/* Use the same MusicStyleSelector as in Subscribe */}
        <MusicStyleSelector
          onChange={setSelectedStyle}
          multiSelect={false}
          availableStyles={[
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
          ]}
        />

        <Input
          name="description"
          placeholder="Collection Description"
          value={collectionData.description}
          onChange={handleInputChange}
        />
        {/* Add Token Price Input */}
        <Input
          type="number"
          placeholder="Token Price (ETH)"
          value={tokenPrice}
          onChange={(e) => setTokenPrice(e.target.value)}
        />
        <div className="flex items-center space-x-2 mb-4">
          <Checkbox
            id="isPublic"
            checked={isPublic}
            onCheckedChange={handleIsPublicChange}
          />
          <label htmlFor="isPublic">Make collection public</label>
        </div>
      </div>

      {/* File Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed p-8 text-center cursor-pointer
          ${isDragActive ? "border-primary" : "border-gray-300"}`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the files here ...</p>
        ) : (
          <p>Drag 'n' drop some files here, or click to select files</p>
        )}
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div>
          <h3>Uploaded Files ({uploadedFiles.length}):</h3>
          <ul>
            {uploadedFiles.map((file, index) => (
              <li key={index}>{file.name}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Deploy Button */}
      <Button
        onClick={handleCreateCollection}
        disabled={
          isCreating ||
          !collectionName ||
          !selectedStyle ||
          !uploadedFiles.length ||
          uploadedFiles.length === 0 ||
          !uploadedCIDs.length ||
          !tokenPrice ||
          !collectionData.description
        }
        className="w-full"
      >
        {isCreating ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating...
          </div>
        ) : (
          "Create Collection"
        )}
      </Button>

      {/* Button to fetch artist name */}
      <Button onClick={handleFetchArtistName}>Get Artist Name</Button>

      {/* Span to display artist name */}
      <span className="ml-2">Artist Name: {artistName}</span>

      {/* Debug Information */}
      <div className="mt-8 p-4 bg-gray-100 rounded-md text-sm">
        <h3 className="font-bold mb-2">Debug Information:</h3>
        <pre className="whitespace-pre-wrap">
          {safeStringify({
            address,
            artistInfo: {
              name: artistName,
              musicStyles,
              deploymentDate,
              isRegistered,
            },
          })}
        </pre>
      </div>
    </div>
  );
};

export default CreateCollectionWorkflow;
