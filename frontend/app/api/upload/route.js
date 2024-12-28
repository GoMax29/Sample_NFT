import { NextResponse } from "next/server";

export async function POST(request) {
  const data = await request.formData();
  const file = data.get("file");

  const response = await fetch(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PINATA_JWT}`, // Note: no NEXT_PUBLIC_ prefix
      },
      body: data,
    }
  );

  const result = await response.json();
  return NextResponse.json(result);
}
