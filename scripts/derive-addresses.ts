import { createConfig, regtest, connect, AddressPurpose } from "@midl/core";
import { keyPairConnector } from "@midl/node";
import { getEVMAddress } from "@midl/executor";

async function main() {
  const mnemonic = "glimpse donkey diet alley goose eyebrow bachelor paddle item bargain heavy wool";

  const connector = keyPairConnector({ mnemonic });
  const config = createConfig({
    networks: [regtest],
    connectors: [connector],
    persist: false,
  });

  const accounts = await connect(config, {
    purposes: [AddressPurpose.Ordinals, AddressPurpose.Payment],
  });

  console.log("=== WALLET ADDRESSES ===");
  for (const acc of accounts) {
    console.log(`\n${acc.purpose.toUpperCase()}:`);
    console.log(`  BTC Address: ${acc.address}`);
    console.log(`  Public Key:  ${acc.publicKey}`);
    const evm = getEVMAddress(acc, regtest);
    console.log(`  EVM Address: ${evm}`);
  }
  console.log("\n========================");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
