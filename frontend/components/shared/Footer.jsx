"use client";

import { useBalance } from "wagmi";
import ClientOnly from "./ClientOnly";
import { WagmiConfig } from "wagmi";
import { config } from "../../config/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Use the correct treasury address
const TREASURY_ADDRESS = "0x145d50e8daeaab284cac5d888759657229fb723d";

// Create a client
const queryClient = new QueryClient();

// Separate component for balance that uses the Wagmi hook
const TreasuryBalance = () => {
  const { data: treasuryBalance } = useBalance({
    address: TREASURY_ADDRESS,
    chainId: 84532, // Base Sepolia
  });

  return (
    <div className="text-gray-600">
      Treasury Balance:{" "}
      {treasuryBalance
        ? Number(treasuryBalance.formatted).toFixed(6)
        : "0.000000"}{" "}
      ETH
    </div>
  );
};

// Wrapped version of TreasuryBalance with both providers
const WrappedTreasuryBalance = () => (
  <WagmiConfig config={config}>
    <QueryClientProvider client={queryClient}>
      <TreasuryBalance />
    </QueryClientProvider>
  </WagmiConfig>
);

// Main Footer component
const Footer = () => {
  const footerContent = (
    <footer className="footer flex justify-between items-center px-6 py-4 bg-gray-100">
      <div>All rights reserved &copy; Alyra {new Date().getFullYear()}</div>
      <ClientOnly>
        <WrappedTreasuryBalance />
      </ClientOnly>
    </footer>
  );

  return footerContent;
};

export default Footer;
