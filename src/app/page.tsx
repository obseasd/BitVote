"use client";

import { Header } from "@/components/Header";
import { PollCard } from "@/components/PollCard";
import { BITVOTE_ABI, BITVOTE_ADDRESS } from "@/config/contract";
import { useReadContract, useReadContracts } from "wagmi";
import Link from "next/link";
import { useAccounts } from "@midl/react";

export default function Home() {
  const { isConnected } = useAccounts();

  const { data: totalPolls } = useReadContract({
    abi: BITVOTE_ABI,
    address: BITVOTE_ADDRESS,
    functionName: "totalPolls",
  });

  const pollCount = Number(totalPolls || 0);
  const pollIds = Array.from({ length: pollCount }, (_, i) => pollCount - 1 - i);

  const { data: pollsData } = useReadContracts({
    contracts: pollIds.map((id) => ({
      abi: BITVOTE_ABI,
      address: BITVOTE_ADDRESS,
      functionName: "getPoll" as const,
      args: [BigInt(id)],
    })),
  });

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">
              Decentralized Polls on{" "}
              <span className="text-accent">Bitcoin</span>
            </h1>
            <p className="text-muted">
              Create polls and vote with your Bitcoin wallet. Every vote is
              on-chain.
            </p>
          </div>
          {isConnected && (
            <Link
              href="/create"
              className="bg-accent hover:bg-accent-hover text-black font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              + New Poll
            </Link>
          )}
        </div>

        {pollCount === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">&#9745;</div>
            <h2 className="text-xl font-semibold mb-2">No polls yet</h2>
            <p className="text-muted mb-6">
              Be the first to create a poll on Bitcoin!
            </p>
            {isConnected ? (
              <Link
                href="/create"
                className="bg-accent hover:bg-accent-hover text-black font-semibold px-6 py-2.5 rounded-lg transition-colors inline-block"
              >
                Create First Poll
              </Link>
            ) : (
              <p className="text-sm text-muted">
                Connect your Xverse wallet to get started
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pollIds.map((id, index) => {
              const result = pollsData?.[index]?.result as
                | [string, string[], bigint[], string, bigint, boolean, bigint]
                | undefined;
              if (!result) return null;

              const [question, options, voteCounts, creator, , active, totalVoteCount] = result;

              return (
                <PollCard
                  key={id}
                  pollId={id}
                  question={question}
                  options={options}
                  voteCounts={voteCounts}
                  creator={creator}
                  active={active}
                  totalVotes={totalVoteCount}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
