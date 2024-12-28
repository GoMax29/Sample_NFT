"use client";

export default function TestEnv() {
  return (
    <div className="p-4 bg-gray-100 rounded-md">
      <h1 className="text-xl font-bold mb-2">Environment Variable Test</h1>
      <p>
        Pinata JWT exists: {process.env.NEXT_PUBLIC_PINATA_JWT ? "Yes" : "No"}
      </p>
      <p>Pinata Gateway: {process.env.NEXT_PUBLIC_PINATA_GATEWAY}</p>
    </div>
  );
}
