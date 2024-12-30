import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const data = await request.formData();
    const file = data.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Debug logs
    console.log("Uploading file:", file.name);
    console.log("File type:", file.type);
    console.log("File size:", file.size);

    // Create a new FormData instance for Pinata
    const pinataFormData = new FormData();
    pinataFormData.append("file", file);

    const response = await fetch(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
        },
        body: pinataFormData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Pinata error:", errorText);
      return NextResponse.json(
        { error: `Pinata upload failed: ${response.statusText}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log("Pinata upload result:", result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
