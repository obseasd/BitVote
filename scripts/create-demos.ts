/**
 * Create demo polls + votes on Midl Regtest for hackathon demo.
 *
 * Usage:
 *   MNEMONIC="your seed" npx tsx --require ./scripts/viem-patch.cjs scripts/create-demos.ts
 */

import { createConfig, regtest, connect, AddressPurpose } from "@midl/core";
import { keyPairConnector } from "@midl/node";
import {
  addTxIntention,
  finalizeBTCTransaction,
  signIntentions,
  getEVMAddress,
  midlRegtest,
} from "@midl/executor";
import { createPublicClient, http, encodeFunctionData } from "viem";
import { sendBTCTransactions } from "@midl/viem/actions";
import { BITVOTE_ABI, BITVOTE_ADDRESS } from "../src/config/contract";

async function executeTx(
  config: any,
  publicClient: any,
  data: `0x${string}`
) {
  const intention = await addTxIntention(config, {
    evmTransaction: {
      to: BITVOTE_ADDRESS as `0x${string}`,
      data,
      gas: 500_000n,
    },
  });

  const btcTx = await finalizeBTCTransaction(config, [intention], publicClient, {
    skipEstimateGas: true,
  });

  const signed = await signIntentions(config, publicClient, [intention], {
    txId: btcTx.tx.id,
  });

  const evmHashes = await sendBTCTransactions(publicClient, {
    serializedTransactions: signed,
    btcTransaction: btcTx.tx.hex,
  });

  if (evmHashes?.[0]) {
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: evmHashes[0],
    });
    return receipt;
  }
  return null;
}

async function main() {
  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    console.error("Set MNEMONIC env var");
    process.exit(1);
  }

  const connector = keyPairConnector({ mnemonic });
  const config = createConfig({
    networks: [regtest],
    connectors: [connector],
    persist: false,
  });

  await connect(config, {
    purposes: [AddressPurpose.Ordinals, AddressPurpose.Payment],
  });

  const publicClient = createPublicClient({
    chain: midlRegtest as any,
    transport: http(),
  });

  const demos = [
    {
      question: "Best Bitcoin L2?",
      options: ["Midl Protocol", "Lightning Network", "Stacks", "RSK"],
    },
    {
      question: "Will BTC hit 200K in 2026?",
      options: ["Yes, easily", "Maybe by EOY", "Not this cycle", "Already there"],
    },
    {
      question: "What should Midl build next?",
      options: ["NFT marketplace", "DEX", "Lending protocol", "Social platform"],
    },
  ];

  // Create polls
  for (const demo of demos) {
    console.log(`\nCreating poll: "${demo.question}"`);
    const data = encodeFunctionData({
      abi: BITVOTE_ABI,
      functionName: "createPoll",
      args: [demo.question, demo.options],
    });

    const receipt = await executeTx(config, publicClient, data);
    if (receipt) {
      console.log(`  Created in block ${receipt.blockNumber}`);
    }

    // Wait between transactions for nonce
    await new Promise((r) => setTimeout(r, 3000));
  }

  // Vote on poll 0, option 0 ("Midl Protocol")
  console.log("\nVoting on poll 0: Midl Protocol");
  const voteData = encodeFunctionData({
    abi: BITVOTE_ABI,
    functionName: "vote",
    args: [0n, 0n],
  });
  const voteReceipt = await executeTx(config, publicClient, voteData);
  if (voteReceipt) {
    console.log(`  Vote recorded in block ${voteReceipt.blockNumber}`);
  }

  console.log("\nDemo data created!");
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
