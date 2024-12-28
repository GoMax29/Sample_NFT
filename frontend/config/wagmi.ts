import { http, fallback } from 'viem'
import { baseSepolia } from 'viem/chains'
import { createPublicClient } from 'viem'
import { createConfig } from 'wagmi'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'

// Array of RPC endpoints with longer delays and timeouts
const transports = [
    // Primary Infura endpoint
    http(process.env.NEXT_PUBLIC_INFURA_URL, {
        retryCount: 3,
        retryDelay: 2000,    // Increased to 2s
        timeout: 30000,
        batch: true,
    }),
    // Fallback endpoints with higher delays
    http('https://sepolia.base.org', {
        retryCount: 2,
        retryDelay: 3000,    // Increased to 3s
        timeout: 30000,
        batch: true,
    })
]

export const baseSepoliaClient = createPublicClient({
    chain: baseSepolia,
    transport: fallback(transports, {
        rank: true,
        retryCount: 2,
        retryDelay: 3000,    // Increased delay between fallbacks
    }),
    batch: {
        multicall: {
            wait: 2000,        // Increased to 2s between batches
            batchSize: 100     // Reduced batch size
        }
    }
})

// Export the config for wagmi using RainbowKit's configuration
export const config = getDefaultConfig({
    appName: 'NFT_Sample_Creator',
    projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_ID || '',
    chains: [baseSepolia],
    transports: {
        [baseSepolia.id]: fallback(transports, {
            rank: true,
            retryCount: 2,
            retryDelay: 3000
        })
    }
}) 