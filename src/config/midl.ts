import { createConfig } from "@midl/core";
import { xverseConnector } from "@midl/connectors";
import { RegtestBridgeProvider } from "./regtestBridgeProvider";

// Custom network: accepts testnet addresses (tb1...) from Xverse
// but routes to regtest infrastructure (staging.midl.xyz)
const regtestAsTestnet = {
  id: "regtest",        // → getEVMFromBitcoinNetwork maps to midlRegtest
  network: "testnet",   // → address validation accepts tb1... from Xverse
  explorerUrl: "https://mempool.staging.midl.xyz",
};

export const midlConfig = createConfig({
  networks: [regtestAsTestnet],
  connectors: [xverseConnector()],
  provider: new RegtestBridgeProvider(),
  persist: true,
});
