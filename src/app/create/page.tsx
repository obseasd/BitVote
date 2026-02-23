"use client";

import { Header } from "@/components/Header";
import { BITVOTE_ABI, BITVOTE_ADDRESS } from "@/config/contract";
import { useAccounts, useWaitForTransaction } from "@midl/react";
import {
  useAddTxIntention,
  useFinalizeBTCTransaction,
  useSignIntention,
  useSendBTCTransactions,
} from "@midl/executor-react";
import { useReadContract } from "wagmi";
import { encodeFunctionData } from "viem";
import { RegtestBridgeProvider } from "@/config/regtestBridgeProvider";
import { useToast } from "@/components/Toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

type TxStep = "idle" | "adding" | "finalizing" | "signing" | "broadcasting" | "waiting" | "done" | "error";

export default function CreatePollPage() {
  const router = useRouter();
  const { toast } = useToast();
  const accountsResult = useAccounts();
  const isConnected = accountsResult.isConnected;
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [step, setStep] = useState<TxStep>("idle");
  const [error, setError] = useState("");

  // Check chain reachability for demo mode detection
  const { data: chainCheck, isError: isChainError } = useReadContract({
    abi: BITVOTE_ABI,
    address: BITVOTE_ADDRESS,
    functionName: "totalPolls",
  });

  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (chainCheck !== undefined || isChainError) return;
    const timer = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, [chainCheck, isChainError]);

  const isDemoMode = isChainError || (timedOut && chainCheck === undefined);

  const { addTxIntention, txIntentions } = useAddTxIntention();
  const { finalizeBTCTransaction, data: btcData } = useFinalizeBTCTransaction();
  const { signIntentionAsync } = useSignIntention();
  const { sendBTCTransactionsAsync } = useSendBTCTransactions();
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

  // Demo create handler: simulates poll creation locally
  const handleDemoCreate = () => {
    if (!isValid) return;
    setStep("adding");
    setTimeout(() => {
      setStep("broadcasting");
      setTimeout(() => {
        setStep("done");
        toast("Poll created! (Demo mode)", "success");
        setTimeout(() => router.push("/"), 2000);
      }, 1000);
    }, 800);
  };

  const handleCreate = async () => {
    if (!isValid) return;

    // Use demo handler in demo mode
    if (isDemoMode) {
      handleDemoCreate();
      return;
    }

    setError("");

    try {
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
      console.log("[BitVote] btcData ready, signing...", btcData.tx.id);
      handleSign();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [btcData]);

  const handleSign = async () => {
    if (!btcData) return;
    try {
      setStep("signing");
      console.log("[BitVote] Signing intentions:", txIntentions.length);
      const signedTxs: `0x${string}`[] = [];

      for (const intention of txIntentions) {
        console.log("[BitVote] Signing intention...");
        const signed = await signIntentionAsync({
          intention,
          intentions: txIntentions,
          txId: btcData.tx.id,
        });
        console.log("[BitVote] Signed tx prefix:", signed.substring(0, 10), "len:", signed.length);
        signedTxs.push(signed);
      }

      setStep("broadcasting");
      console.log("[BitVote] Sending via sendBTCTransactions...");
      const evmHashes = await sendBTCTransactionsAsync({
        serializedTransactions: signedTxs,
        btcTransaction: btcData.tx.hex,
      });
      console.log("[BitVote] EVM hashes:", evmHashes);

      console.log("[BitVote] Broadcasting BTC tx to mempool...");
      try {
        const provider = new RegtestBridgeProvider();
        const btcTxId = await provider.broadcastTransaction(null, btcData.tx.hex);
        console.log("[BitVote] BTC broadcast done:", btcTxId);
      } catch (e) {
        console.warn("[BitVote] BTC broadcast warning:", e);
      }

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

  if (!isConnected && !isDemoMode) {
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

        {isDemoMode && (
          <div className="bg-accent/10 border border-accent/20 rounded-lg px-4 py-3 text-sm text-accent mb-4 flex items-center gap-2">
            <span className="text-base">&#9889;</span>
            <span>Demo mode &mdash; poll creation is simulated. The Midl chain is currently syncing.</span>
          </div>
        )}

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
              {isDemoMode ? "Poll created! (Demo mode) Redirecting..." : "Poll created successfully! Redirecting..."}
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
