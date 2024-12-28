import { PinataSDK } from "pinata-web3";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
const gtw = process.env.PINATA_GTW;
const jwt = process.env.PINATA_JWT;
import fs from "fs";
import path from "path";
const pinata = new PinataSDK({
  pinataJwt: jwt,
  pinataGateway: gtw,
});

const filePath = process.argv[2];
const id = process.argv[3];

if (!filePath) {
  console.error("Veuillez fournir le chemin du fichier en argument.");
  process.exit(1); // Sort du script avec une erreur
}

async function uploadSample(id, filePath) {
  try {
    // Create a Blob from the file buffer
    const blob1 = new Blob([fs.readFileSync(filePath)]);

    // Create a File object from the Blob
    const file1 = new File([blob1], path.basename(filePath), {
      type: "sample",
    });

    // Upload the file using the File object
    const fileUpload = await pinata.upload.file(file1);

    // Add a retry mechanism to obtain CID
    let CID;
    const maxRetries = 5;
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      CID = fileUpload.IpfsHash;
      console.log(attempt, CID);
      if (CID) {
        break; // Exit loop if CID is found
      }

      console.log(`Attempt ${attempt}: CID not yet available, retrying...`);
      await delay(10000); // Wait 10 seconds between attempts
    }

    // If CID is still undefined after retries
    if (!CID) {
      throw new Error(
        "Failed to obtain CID for the uploaded file after multiple attempts"
      );
    }
    //__________________________________
    // Add a retry mechanism to obtain json CID
    const jsonUpload = await pinata.upload.json({
      name: `Sample ${id}`,
      description: `This is a new sample with ID # ${id}`,
      sample: `${gtw}/ipfs/${CID}`, // URI of the file
    });

    let jsonCID;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      jsonCID = jsonUpload.IpfsHash;
      console.log(attempt, jsonCID);
      if (jsonCID) {
        break; // Exit loop if CID is found
      }

      console.log(`Attempt ${attempt}: CID not yet available, retrying...`);
      await delay(10000); // Wait 10 seconds between attempts
    }

    // If CID is still undefined after retries
    if (!jsonCID) {
      throw new Error(
        "Failed to obtain JasonCID for the uploaded file after multiple attempts"
      );
    }

    const jsonURI = `${gtw}/ipfs/${jsonCID}/${id}.json`;

    console.log("File CID:", CID);
    console.log("JSON URI:", jsonURI);
    return jsonURI;
  } catch (error) {
    console.error("Error uploading to Pinata:", error);
    throw error;
  }
}

// async function main() {
//   try {
//       const blob1 = new Blob([fs.readFileSync(filePath)]);
//       // const file1 = new File([blob1], `asset_${id}.png`, { type: "image/png" });
//       const file1 = new File([blob1], path.basename(filePath), { type: "image/png"})
//       const upload = await pinata.upload.file(file1);

//       const upload_Json = await pinata.upload.json({
//           name: "Alyra Bonhomme 2 NFT",
//           description: "A cool NFT from Max",
//         })
//     console.log(upload);
//     console.log(upload_Json);
//   } catch (error) {
//     console.log(error);
//   }
// }

await uploadSample(id, filePath);
