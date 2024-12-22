"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import TestEnv from "@/components/TestEnv";
import CreateCollection from "@/components/shared/CreateCollection";
import Subscribe from "@/components/shared/Subscribe";
import CreateCollectionWorkflow from "@/components/shared/CreateCollectionWorkflow";
import ArtistDashboard from "@/components/shared/ArtistDashboard";
import "../app/globals.css";
import CreateCollectionButton from "@/components/ui/CreateCollectionButton";
console.log("Pinata JWT:", process.env.NEXT_PUBLIC_PINATA_JWT);
export default function Home() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold">Welcome to the Current Page</h1>
      <p className="mt-4">Here you can find various options.</p>

      {/* <CreateCollectionButton />

      <TestEnv /> */}
      {/* <Subscribe />
      <CreateCollectionWorkflow />
      <ArtistDashboard /> */}
    </div>
  );
}
