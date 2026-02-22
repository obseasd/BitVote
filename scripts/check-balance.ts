import { createConfig, regtest, connect, AddressPurpose } from "@midl/core";
import { keyPairConnector } from "@midl/node";

async function main() {
  const mnemonic = "glimpse donkey diet alley goose eyebrow bachelor paddle item bargain heavy wool";
  const connector = keyPairConnector({ mnemonic });
  const config = createConfig({
    networks: [regtest],
    connectors: [connector],
    persist: false,
  });
  await connect(config, { purposes: [AddressPurpose.Payment, AddressPurpose.Ordinals] });

  const state = config.getState();
  console.log("Accounts:", state.accounts?.map((a: any) => ({ purpose: a.purpose, address: a.address })));

  const provider = state.provider;
  if (provider) {
    for (const acc of state.accounts || []) {
      try {
        const utxos = await provider.getUtxos(acc.address);
        console.log(`\n${acc.purpose} UTXOs (${acc.address}):`);
        console.log(JSON.stringify(utxos, null, 2));
      } catch (e: any) {
        console.log(`Error for ${acc.purpose}:`, e.message);
      }
    }
  }
}

main().catch(console.error);
