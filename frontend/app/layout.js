import RainbowKitAndWagmiProvider from "@/app/RainbowKitAndWagmiProvider";
import Header from "@/components/shared/Header";
import { Toaster } from "@/components/ui/toaster";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <RainbowKitAndWagmiProvider>
          <Header />
          <main>{children}</main>
          <Toaster />
        </RainbowKitAndWagmiProvider>
      </body>
    </html>
  );
}
