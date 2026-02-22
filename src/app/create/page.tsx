"use client";

import { Header } from "@/components/Header";
import { BITVOTE_ABI, BITVOTE_ADDRESS } from "@/config/contract";
import { useAccounts, useWaitForTransaction, useConfigInternal } from "@midl/react";
import {
  useAddTxIntention,
  useFinalizeBTCTransaction,
  useSendBTCTransactions,
} from "@midl/executor-react";
import { serializeIntention, extractEVMSignature } from "@midl/executor";
import { getDefaultAccount, signMessage as midlSignMessage, SignMessageProtocol } from "@midl/core";
import { encodeFunctionData, serializeTransaction, keccak256 } from "viem";
import { usePublicClient } from "wagmi";
import { RegtestBridgeProvider } from "@/config/regtestBridgeProvider";
import { useToast } from "@/components/Toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

type TxStep = "idle" | "adding" | "finalizing" | "signing" | "broadcasting" | "waiting" | "done" | "error";

export default function CreatePollPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { isConnected } = useAccounts();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [step, setStep] = useState<TxStep>("idle");
  const [error, setError] = useState("");

  const midlConfig = useConfigInternal();
  const publicClient = usePublicClient();
  const { addTxIntention, txIntentions } = useAddTxIntention();
  const { finalizeBTCTransaction, data: btcData } = useFinalizeBTCTransaction();
  useSendBTCTransactions(); // keep hook mounted
  const { waitForTransaction } = useWaitForTransaction({
    mutation: {
      onSuccess: () => {
        setStep("done");
        toast("Poll created on Bitcoin!", "success");
        setTimeout(() => router.push("/"), 2000);
      },
      onError: (err) => {
        console.error("[BitVote] waitForTransaction error:", err);
        setError(err.message);
        setStep("error");
        toast("Transaction failed", "error");
      },
    },
  });

  const addOption = () => {
    if (options.length < 4) setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const isValid =
    question.trim().length > 0 &&
    options.filter((o) => o.trim().length > 0).length >= 2;

  const handleCreate = async () => {
    if (!isValid) return;
    setError("");

    try {
      // Step 1: Add intention
      setStep("adding");
      const filteredOptions = options.filter((o) => o.trim().length > 0);

      console.log("[BitVote] Adding tx intention...");
      addTxIntention({
        reset: true,
        intention: {
          evmTransaction: {
            to: BITVOTE_ADDRESS as `0x${string}`,
            data: encodeFunctionData({
              abi: BITVOTE_ABI,
              functionName: "createPoll",
              args: [question.trim(), filteredOptions.map((o) => o.trim())],
            }),
            gas: BigInt(500_000),
          },
        },
      });

      // Step 2: Finalize BTC transaction
      setStep("finalizing");
      await new Promise((r) => setTimeout(r, 500));
      console.log("[BitVote] Finalizing BTC transaction...");
      finalizeBTCTransaction();
    } catch (err: unknown) {
      console.error("[BitVote] handleCreate error:", err);
      setError(err instanceof Error ? err.message : "Failed to create transaction");
      setStep("error");
    }
  };

  // Auto-trigger sign when btcData becomes available
  useEffect(() => {
    if (btcData && step === "finalizing") {
      console.log("[BitVote] btcData ready, auto-signing...", btcData.tx.id);
      handleSign();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [btcData]);

  const handleSign = async () => {
    if (!btcData || !publicClient) return;
    try {
      setStep("signing");
      console.log("[BitVote] Manual signing flow. Intentions:", txIntentions.length);
      const signedTxs: `0x${string}`[] = [];

      for (const intention of txIntentions) {
        // 1. Serialize intention (adds BTC fields, nonce, gasPrice)
        console.log("[BitVote] Step 1: serializeIntention...");
        const { serialized, intention: prepared } = await serializeIntention(
          midlConfig, publicClient, intention, txIntentions, { txId: btcData.tx.id }
        );
        console.log("[BitVote] Serialized prefix:", serialized.substring(0, 10), "len:", serialized.length);
        if (!prepared.evmTransaction) throw new Error("No EVM transaction");
        console.log("[BitVote] Prepared evmTx keys:", Object.keys(prepared.evmTransaction).join(", "));

        // 2. Hash the serialized transaction
        const message = keccak256(serialized);
        console.log("[BitVote] Step 2: message hash:", message);

        // 3. Get the signing account
        const account = getDefaultAccount(midlConfig);
        console.log("[BitVote] Step 3: account addr:", account.address);
        console.log("[BitVote] Account type:", account.addressType, "pubkey:", account.publicKey?.substring(0, 20));

        // 4. Sign the message hash via wallet (BIP-322)
        console.log("[BitVote] Step 4: signing via wallet...");
        const sigData = await midlSignMessage(midlConfig, {
          message,
          address: account.address,
          protocol: SignMessageProtocol.Bip322,
        });
        console.log("[BitVote] Signature received. Protocol:", sigData.protocol, "sig length:", sigData.signature.length);
        console.log("[BitVote] Sig preview:", sigData.signature.substring(0, 40));

        // 5. Extract r, s, v from BIP-322 signature
        console.log("[BitVote] Step 5: extractEVMSignature...");
        const { r, s, v } = await extractEVMSignature(
          message, sigData.signature, sigData.protocol,
          { addressType: account.addressType, publicKey: account.publicKey }
        );
        console.log("[BitVote] r:", r.substring(0, 20), "s:", s.substring(0, 20), "v:", v.toString());

        // 6. Create final signed transaction (Type-7 with BTC fields + signature)
        console.log("[BitVote] Step 6: final serializeTransaction...");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const signedTx = serializeTransaction(prepared.evmTransaction as any, { r, s, v });
        console.log("[BitVote] Signed tx prefix:", signedTx.substring(0, 10), "len:", signedTx.length);
        signedTxs.push(signedTx);
      }

      // 7. Send to RPC
      setStep("broadcasting");
      console.log("[BitVote] Step 7: sending to RPC...");
      const rpcResponse = await fetch("https://rpc.staging.midl.xyz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_sendBTCTransactions",
          params: [signedTxs, btcData.tx.hex],
          id: 1,
        }),
      });
      const rpcResult = await rpcResponse.json();
      console.log("[BitVote] RPC response:", JSON.stringify(rpcResult));
      if (rpcResult.error) {
        throw new Error(`RPC error: ${rpcResult.error.message}`);
      }
      console.log("[BitVote] EVM hashes:", rpcResult.result);

      // 8. Broadcast BTC
      console.log("[BitVote] Step 8: broadcasting BTC...");
      const provider = new RegtestBridgeProvider();
      const btcTxId = await provider.broadcastTransaction(null, btcData.tx.hex);
      console.log("[BitVote] BTC broadcast done! TxId:", btcTxId);

      // 9. Wait for confirmation
      setStep("waiting");
      waitForTransaction({ txId: btcData.tx.id });
    } catch (err: unknown) {
      console.error("[BitVote] handleSign error:", err);
      const msg = err instanceof Error ? err.message : "Transaction failed";
      setError(msg);
      setStep("error");
      toast(msg, "error");
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
          <p className="text-muted">
            You need to connect your Xverse wallet to create a poll.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Create a Poll</h1>

        <div className="bg-card border border-card-border rounded-xl p-6 space-y-6">
          {/* Question */}
          <div>
            <label className="block text-sm font-medium mb-2">Question</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What should we build next?"
              className="w-full bg-background border border-card-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
              disabled={step !== "idle" && step !== "error"}
            />
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Options ({options.length}/4)
            </label>
            <div className="space-y-3">
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 bg-background border border-card-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                    disabled={step !== "idle" && step !== "error"}
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => removeOption(i)}
                      className="text-muted hover:text-danger px-2 transition-colors"
                      disabled={step !== "idle" && step !== "error"}
                    >
                      &#10005;
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 4 && (
              <button
                onClick={addOption}
                className="mt-3 text-sm text-accent hover:text-accent-hover transition-colors"
                disabled={step !== "idle" && step !== "error"}
              >
                + Add Option
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-danger/10 border border-danger/20 rounded-lg px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          {/* Status */}
          {step !== "idle" && step !== "error" && step !== "done" && (
            <div className="bg-accent/10 border border-accent/20 rounded-lg px-4 py-3 text-sm text-accent">
              {step === "adding" && "Preparing transaction..."}
              {step === "finalizing" && "Finalizing Bitcoin transaction..."}
              {step === "signing" && "Please sign the transaction in your wallet..."}
              {step === "broadcasting" && "Broadcasting transaction..."}
              {step === "waiting" && "Waiting for confirmation..."}
            </div>
          )}

          {step === "done" && (
            <div className="bg-success/10 border border-success/20 rounded-lg px-4 py-3 text-sm text-success">
              Poll created successfully! Redirecting...
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {(step === "idle" || step === "error") && (
              <button
                onClick={handleCreate}
                disabled={!isValid}
                className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-lg transition-colors"
              >
                Create Poll
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
