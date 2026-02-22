"use client";

import { Header } from "@/components/Header";
import { BITVOTE_ABI, BITVOTE_ADDRESS } from "@/config/contract";
import { useAccounts, useWaitForTransaction } from "@midl/react";
import { useEVMAddress } from "@midl/executor-react";
import {
  useAddTxIntention,
  useFinalizeBTCTransaction,
  useSignIntention,
  useSendBTCTransactions,
} from "@midl/executor-react";
import { useReadContract } from "wagmi";
import { encodeFunctionData } from "viem";
import { useToast } from "@/components/Toast";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

type TxStep = "idle" | "adding" | "finalizing" | "signing" | "broadcasting" | "waiting" | "done" | "error";

export default function PollPage() {
  const { toast } = useToast();
  const params = useParams();
  const pollId = Number(params.id);
  const accountsResult = useAccounts();
  const isConnected = accountsResult.isConnected;
  const accounts = accountsResult.accounts;
  const ordinalsAccount = accounts?.find((a) => a.purpose === "ordinals");
  const evmAddress = useEVMAddress({ from: ordinalsAccount?.address });

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [step, setStep] = useState<TxStep>("idle");
  const [error, setError] = useState("");

  const { data: pollData, refetch } = useReadContract({
    abi: BITVOTE_ABI,
    address: BITVOTE_ADDRESS,
    functionName: "getPoll",
    args: [BigInt(pollId)],
  });

  const { data: userHasVoted, refetch: refetchVoted } = useReadContract({
    abi: BITVOTE_ABI,
    address: BITVOTE_ADDRESS,
    functionName: "hasVoted",
    args: evmAddress ? [BigInt(pollId), evmAddress as `0x${string}`] : undefined,
  });

  const { addTxIntention, txIntentions } = useAddTxIntention();
  const { finalizeBTCTransaction, data: btcData } = useFinalizeBTCTransaction();
  const { signIntentionAsync } = useSignIntention();
  const { sendBTCTransactionsAsync } = useSendBTCTransactions();
  const { waitForTransaction } = useWaitForTransaction({
    mutation: {
      onSuccess: () => {
        setStep("done");
        toast("Vote recorded on Bitcoin!", "success");
        refetch();
        refetchVoted();
      },
      onError: (err) => {
        setError(err.message);
        setStep("error");
        toast("Transaction failed", "error");
      },
    },
  });

  const poll = pollData as
    | [string, string[], bigint[], string, bigint, boolean, bigint]
    | undefined;

  const question = poll?.[0] || "";
  const options = poll?.[1] || [];
  const voteCounts = poll?.[2] || [];
  const creator = poll?.[3] || "";
  const active = poll?.[5] ?? true;
  const totalVotes = Number(poll?.[6] || 0);
  const hasVoted = Boolean(userHasVoted);

  const handleVote = async () => {
    if (selectedOption === null || hasVoted || !active) return;
    setError("");

    try {
      setStep("adding");
      addTxIntention({
        reset: true,
        intention: {
          evmTransaction: {
            to: BITVOTE_ADDRESS as `0x${string}`,
            data: encodeFunctionData({
              abi: BITVOTE_ABI,
              functionName: "vote",
              args: [BigInt(pollId), BigInt(selectedOption)],
            }),
          },
        },
      });

      setStep("finalizing");
      await new Promise((r) => setTimeout(r, 500));
      finalizeBTCTransaction();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create transaction");
      setStep("error");
    }
  };

  const handleSign = async () => {
    if (!btcData) return;
    try {
      setStep("signing");
      for (const intention of txIntentions) {
        await signIntentionAsync({ intention, txId: btcData.tx.id });
      }

      setStep("broadcasting");
      await sendBTCTransactionsAsync({
        serializedTransactions: txIntentions.map(
          (it) => it.signedEvmTransaction as `0x${string}`
        ),
        btcTransaction: btcData.tx.hex,
      });

      setStep("waiting");
      waitForTransaction({ txId: btcData.tx.id });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setStep("error");
    }
  };

  // Auto-trigger sign when btcData becomes available
  useEffect(() => {
    if (btcData && step === "finalizing") {
      handleSign();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [btcData]);

  if (!poll) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-muted">Loading poll...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-card border border-card-border rounded-xl p-6 animate-fade-in">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <h1 className="text-2xl font-bold">{question}</h1>
            <span
              className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-3 ${
                active
                  ? "bg-success/10 text-success"
                  : "bg-muted/20 text-muted"
              }`}
            >
              {active ? "Active" : "Closed"}
            </span>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {options.map((option, i) => {
              const count = Number(voteCounts[i] || 0);
              const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
              const isSelected = selectedOption === i;
              const canSelect =
                active && !hasVoted && isConnected && step === "idle";

              return (
                <button
                  key={i}
                  onClick={() => canSelect && setSelectedOption(i)}
                  disabled={!canSelect}
                  className={`w-full relative rounded-lg border transition-all text-left ${
                    isSelected
                      ? "border-accent bg-accent/5"
                      : "border-card-border hover:border-card-border/80"
                  } ${!canSelect ? "cursor-default" : "cursor-pointer"}`}
                >
                  {/* Progress bar background */}
                  <div
                    className="absolute inset-0 bg-accent/10 rounded-lg transition-all"
                    style={{ width: `${pct}%` }}
                  />
                  <div className="relative flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* Radio indicator */}
                      {canSelect && (
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "border-accent"
                              : "border-muted"
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-accent" />
                          )}
                        </div>
                      )}
                      <span className="font-medium">{option}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="text-sm text-muted">
                        {count} {count === 1 ? "vote" : "votes"}
                      </span>
                      {totalVotes > 0 && (
                        <span className="text-sm font-mono text-accent">
                          {pct.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Vote count */}
          <div className="text-sm text-muted mb-4">
            {totalVotes} total {totalVotes === 1 ? "vote" : "votes"} &middot;
            Created by{" "}
            <span className="font-mono text-xs">
              {creator.slice(0, 6)}...{creator.slice(-4)}
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-danger/10 border border-danger/20 rounded-lg px-4 py-3 text-sm text-danger mb-4">
              {error}
            </div>
          )}

          {/* Status */}
          {step !== "idle" && step !== "error" && step !== "done" && (
            <div className="bg-accent/10 border border-accent/20 rounded-lg px-4 py-3 text-sm text-accent mb-4">
              {step === "adding" && "Preparing transaction..."}
              {step === "finalizing" && "Finalizing Bitcoin transaction..."}
              {step === "signing" && "Please sign in your wallet..."}
              {step === "broadcasting" && "Broadcasting transaction..."}
              {step === "waiting" && "Waiting for confirmation..."}
            </div>
          )}

          {step === "done" && (
            <div className="bg-success/10 border border-success/20 rounded-lg px-4 py-3 text-sm text-success mb-4">
              Vote recorded on Bitcoin!
            </div>
          )}

          {/* Actions */}
          {!isConnected && (
            <p className="text-sm text-muted text-center">
              Connect your Xverse wallet to vote
            </p>
          )}

          {isConnected && hasVoted && step === "idle" && (
            <div className="text-center text-sm text-success py-2">
              You already voted on this poll
            </div>
          )}

          {isConnected && !hasVoted && active && (step === "idle" || step === "error") && (
            <button
              onClick={handleVote}
              disabled={selectedOption === null}
              className="w-full bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-lg transition-colors"
            >
              {selectedOption !== null
                ? `Vote for "${options[selectedOption]}"`
                : "Select an option to vote"}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
