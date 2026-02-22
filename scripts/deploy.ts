/**
 * Deploy BitVote to Midl Regtest using the Midl executor flow.
 *
 * All EVM transactions on Midl must go through Bitcoin transactions.
 * This script uses @midl/node's keyPairConnector with a mnemonic
 * and the @midl/executor for the 4-step tx flow:
 *   addTxIntention → finalizeBTCTransaction → signIntentions → sendBTCTransactions
 *
 * Usage:
 *   MNEMONIC="your 12/24 word seed phrase" npx tsx scripts/deploy.ts
 *
 * Get regtest BTC from: https://faucet.staging.midl.xyz
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
import { createPublicClient, http, getContractAddress } from "viem";
import { sendBTCTransactions } from "@midl/viem/actions";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    console.error("Set MNEMONIC env var (12 or 24 word seed phrase)");
    console.error('Example: MNEMONIC="word1 word2 ..." npx tsx scripts/deploy.ts');
    process.exit(1);
  }

  // 1. Setup connector from mnemonic
  console.log("Setting up wallet from mnemonic...");
  const connector = keyPairConnector({ mnemonic });

  // 2. Create Midl config
  const config = createConfig({
    networks: [regtest],
    connectors: [connector],
    persist: false,
  });

  // 3. Connect wallet
  const accounts = await connect(config, {
    purposes: [AddressPurpose.Ordinals, AddressPurpose.Payment],
  });

  const ordinalsAccount = accounts.find((a) => a.purpose === "ordinals");
  const paymentAccount = accounts.find((a) => a.purpose === "payment");

  if (!ordinalsAccount) {
    console.error("No ordinals account found");
    process.exit(1);
  }

  console.log("BTC Ordinals address:", ordinalsAccount.address);
  console.log("BTC Payment address:", paymentAccount?.address);

  // Derive EVM address from BTC account
  const evmAddress = getEVMAddress(ordinalsAccount, regtest);
  console.log("EVM address:", evmAddress);

  // 4. Create viem public client for Midl EVM
  const publicClient = createPublicClient({
    chain: midlRegtest as any,
    transport: http(),
  });

  // Check EVM balance
  const balance = await publicClient.getBalance({ address: evmAddress });
  console.log("EVM Balance:", balance.toString(), "wei");

  // Get current nonce for contract address prediction
  const nonce = await publicClient.getTransactionCount({ address: evmAddress });
  console.log("Current nonce:", nonce);

  // Predict contract address
  const predictedAddress = getContractAddress({
    from: evmAddress,
    nonce: BigInt(nonce),
  });
  console.log("Predicted contract address:", predictedAddress);

  // 5. Load compiled artifact
  const artifactPath = path.join(__dirname, "../artifacts/contracts/BitVote.sol/BitVote.json");
  if (!fs.existsSync(artifactPath)) {
    console.error("Artifact not found! Run 'npx hardhat compile' first.");
    process.exit(1);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  console.log("\nDeploying BitVote via Midl executor flow...");

  // 6. Step 1: Add deploy intention (no `to` = contract creation)
  // Provide gas limit manually to avoid estimateGasMulti (only in @midl/viem, not resolved in Node.js)
  const intention = await addTxIntention(config, {
    evmTransaction: {
      data: artifact.bytecode as `0x${string}`,
      gas: 3_000_000n,
    },
  });
  console.log("Step 1/4: Intention added");

  // 7. Step 2: Finalize BTC transaction
  console.log("Step 2/4: Finalizing BTC transaction...");
  const btcTx = await finalizeBTCTransaction(config, [intention], publicClient as any, {
    skipEstimateGas: true,
  });
  console.log("BTC TX ID:", btcTx.tx.id);

  // 8. Step 3: Sign intentions
  console.log("Step 3/4: Signing intentions...");
  const signed = await signIntentions(config, publicClient as any, [intention], {
    txId: btcTx.tx.id,
  });
  console.log("Signed", signed.length, "intention(s)");

  // Debug: inspect what finalizeBTCTransaction returned
  console.log("BTC TX hex length:", btcTx.tx.hex.length);
  console.log("BTC TX hex (first 100):", btcTx.tx.hex.substring(0, 100));
  console.log("BTC TX psbt length:", btcTx.psbt?.length);
  console.log("Signed EVM txs:", signed.map((s: string) => `${s.substring(0, 20)}... (len: ${s.length})`));

  // 9. Step 4: Broadcast via @midl/viem's sendBTCTransactions
  console.log("Step 4/4: Broadcasting...");
  const evmHashes = await sendBTCTransactions(publicClient as any, {
    serializedTransactions: signed,
    btcTransaction: btcTx.tx.hex,
  });
  console.log("EVM TX hashes:", evmHashes);

  // 10. Wait for receipt
  if (evmHashes && evmHashes.length > 0) {
    console.log("Waiting for confirmation...");
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: evmHashes[0],
    });

    const contractAddress = receipt.contractAddress || predictedAddress;

    console.log("\n=== DEPLOYED ===");
    console.log("Contract Address:", contractAddress);
    console.log("Block:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());
    console.log("EVM TX:", evmHashes[0]);
    console.log("BTC TX:", btcTx.tx.id);
    console.log("Explorer:", `https://blockscout.staging.midl.xyz/address/${contractAddress}`);
    console.log("================\n");

    // Save deployment info
    const deploymentInfo = {
      address: contractAddress,
      evmTransactionHash: evmHashes[0],
      btcTransactionId: btcTx.tx.id,
      blockNumber: Number(receipt.blockNumber),
      deployer: evmAddress,
      btcAddress: ordinalsAccount.address,
      network: "midl-regtest",
      timestamp: new Date().toISOString(),
    };

    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });
    fs.writeFileSync(
      path.join(deploymentsDir, "BitVote.json"),
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("Deployment info saved to deployments/BitVote.json");

    console.log("\n>>> Update src/config/contract.ts with:");
    console.log(`export const BITVOTE_ADDRESS = "${contractAddress}" as const;`);
  } else {
    console.log("No EVM hashes returned. Check BTC TX on explorer.");
    console.log("BTC TX:", btcTx.tx.id);
    console.log("Predicted contract address:", predictedAddress);
  }
}

main().catch((err) => {
  console.error("Deploy failed:", err);
  process.exit(1);
});
