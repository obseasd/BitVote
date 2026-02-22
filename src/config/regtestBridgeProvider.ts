/**
 * Custom MempoolSpaceProvider that bridges testnet addresses (tb1...)
 * to regtest format (bcrt1...) when querying the Midl staging mempool.
 *
 * Xverse browser wallet provides testnet addresses (tb1...),
 * Midl regtest mempool only accepts regtest addresses (bcrt1...).
 * The underlying witness program (script) is identical.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { bech32, bech32m } from "@scure/base";

const STAGING_URL = "https://mempool.staging.midl.xyz";

/** Convert a testnet address (tb1...) to regtest format (bcrt1...) */
function testnetToRegtest(address: string): string {
  if (address.startsWith("bcrt1")) return address;

  if (address.startsWith("tb1p")) {
    const decoded = bech32m.decode(address as `tb1p${string}`);
    return bech32m.encode("bcrt", decoded.words);
  }
  if (address.startsWith("tb1q")) {
    const decoded = bech32.decode(address as `tb1q${string}`);
    return bech32.encode("bcrt", decoded.words);
  }
  if (address.startsWith("tb1")) {
    try {
      const decoded = bech32m.decode(address as `tb1${string}`);
      return bech32m.encode("bcrt", decoded.words);
    } catch {
      const decoded = bech32.decode(address as `tb1${string}`);
      return bech32.encode("bcrt", decoded.words);
    }
  }

  return address;
}

export class RegtestBridgeProvider {
  async broadcastTransaction(_: any, txHex: string): Promise<string> {
    const url = `${STAGING_URL}/api/tx`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: txHex,
    });
    if (!response.ok) throw new Error(`Broadcast failed: ${response.statusText}`);
    return response.text();
  }

  async getLatestBlockHeight(): Promise<number> {
    const url = `${STAGING_URL}/api/blocks/tip/height`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch block height`);
    return response.json();
  }

  async getFeeRate(): Promise<{ fastestFee: number; halfHourFee: number; hourFee: number }> {
    const url = `${STAGING_URL}/api/v1/fees/recommended`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch fee rate`);
    return response.json();
  }

  async getTransactionStatus(_: any, txid: string): Promise<{ confirmed: boolean; block_height: number }> {
    const url = `${STAGING_URL}/api/tx/${txid}/status`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch tx status`);
    return response.json();
  }

  async getTransactionHex(_: any, txid: string): Promise<string> {
    const url = `${STAGING_URL}/api/tx/${txid}/hex`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch tx hex`);
    return response.text();
  }

  async getUTXOs(_: any, address: string): Promise<any[]> {
    const regtestAddr = testnetToRegtest(address);
    const url = `${STAGING_URL}/api/address/${regtestAddr}/utxo`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch UTXOs for ${regtestAddr}`);
    return response.json();
  }

  async waitForTransaction(
    _: any,
    txid: string,
    requiredConfirmations = 1,
    options?: { timeoutMs?: number }
  ): Promise<number> {
    const startTime = Date.now();
    const timeout = options?.timeoutMs || 120000;

    while (Date.now() - startTime < timeout) {
      try {
        const status = await this.getTransactionStatus(_, txid);
        if (status.confirmed) {
          const height = await this.getLatestBlockHeight();
          const confirmations = height - status.block_height + 1;
          if (confirmations >= requiredConfirmations) return confirmations;
        }
      } catch {
        // ignore, retry
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error("Timeout waiting for transaction confirmation");
  }
}
