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
} from "wagmi";

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

  const { address, isConnected } = useAccount();
  const { toast } = useToast();

  // Get collection address with refetch capability
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

  // Get collection counter with refetch capability
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

  const {
    data: hash,
    error: writeError,
    isPending: writePending,
    writeContract,
  } = useWriteContract({});

  // Add effect to refetch data after collection creation
  const { isSuccess: isDeploySuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (isDeploySuccess) {
      // Refetch both collection address and counter
      refetchCollectionAddress();
      refetchCollectionCounter();
      refetchArtistInfo();
      toast({
        title: "Collection Created",
        description: "Your collection has been created successfully!",
        variant: "success",
      });
    }
  }, [
    isDeploySuccess,
    refetchCollectionAddress,
    refetchCollectionCounter,
    toast,
  ]);

  // Get artist info with proper destructuring
  const { data: artistInfo, error: artistInfoError } = useReadContract({
    address: FACTORY_CONTRACT_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getArtistInfo",
    args: [address || "0x0000000000000000000000000000000000000000"],
    enabled: !!address,
  });

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

    // Check if address exists and artistInfo has been fetched
    if (address && artistInfo) {
      if (!artistInfo.isRegistered) {
        toast({
          title: "Artist Not Registered",
          description:
            "Please register as an artist before creating a collection",
          variant: "warning",
        });
      }
    }
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
    "https://amethyst-worrying-squid-449.mypinata.cloud/ipfs/bafkreidg2lqvm5lolzodu2qyctirhcdymdhucp276scaoioccznkokfsae";

  // File upload handling with updated metadata
  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (!pinata) {
        toast({
          title: "Error",
          description: "Pinata is not initialized",
          variant: "destructive",
        });
        return;
      }

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

          const fileBlob = new Blob([file], { type: file.type });
          const fileUpload = await pinata.upload.file(
            new File([fileBlob], file.name, { type: file.type })
          );

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
          };

          console.log("Uploading metadata:", metadata);

          const jsonUpload = await pinata.upload.json(metadata);
          uploadedCIDs.push(jsonUpload.IpfsHash);
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

        const collectionJson = await pinata.upload.json(collectionMetadata);
        setBaseURI(`ipfs://${collectionJson.IpfsHash}/`);
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
      pinata,
      toast,
      address,
      artistName,
      localArtistName,
      collectionCounterData,
      collectionData,
      tokenPrice,
      isRegistered,
      collectionName,
      selectedStyle,
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

      {/* Profile Button
      <div className="flex justify-end">
        <Link href="/ArtistDashboard">
          <Button
            variant="outline"
            className="flex items-center space-x-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-full px-4 py-2"
          >
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              {artistName ? artistName[0].toUpperCase() : "?"}
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">
                {artistName || "Unknown Artist"}
              </span>
              <span className="text-xs text-gray-500">
                {truncateAddress(address)}
              </span>
            </div>
          </Button>
        </Link>
      </div> */}

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
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isPublic"
            checked={collectionData.isPublic}
            onCheckedChange={(checked) =>
              setCollectionData((prev) => ({ ...prev, isPublic: checked }))
            }
          />
          <label htmlFor="isPublic">
            Make collection public in marketplace
          </label>
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
        className="w-full"
        onClick={deployCollection}
        disabled={isUploading || !baseURI}
      >
        {isUploading ? "Uploading..." : "Create Collection"}
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
