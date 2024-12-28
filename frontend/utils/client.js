// on ne peux pas utiliser (encore) le usewatchContractEvent de wagmi pour récupérer les events => recommandée d'utiliser le getLogs de viem
import { createPublicClient, http } from "viem";
import { hardhat, sepolia, holesky, baseSepolia } from "viem/chains";

const RPC = process.env.INFURA_RPC || "";

export const publicClient = createPublicClient({
  // chain: sepolia,
  // chain: hardhat,
  chain: baseSepolia,
  transport: http(RPC),
});
