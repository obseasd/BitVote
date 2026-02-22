"use client";

import Link from "next/link";

interface PollCardProps {
  pollId: number;
  question: string;
  options: string[];
  voteCounts: bigint[];
  creator: string;
  active: boolean;
  totalVotes: bigint;
}

export function PollCard({
  pollId,
  question,
  options,
  voteCounts,
  active,
  totalVotes,
}: PollCardProps) {
  const total = Number(totalVotes);

  return (
    <Link href={`/poll/${pollId}`}>
      <div className="bg-card border border-card-border rounded-xl p-5 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 transition-all cursor-pointer group animate-fade-in">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold group-hover:text-accent transition-colors line-clamp-2">
            {question}
          </h3>
          <span
            className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-2 ${
              active
                ? "bg-success/10 text-success"
                : "bg-muted/20 text-muted"
            }`}
          >
            {active ? "Active" : "Closed"}
          </span>
        </div>

        <div className="space-y-2 mb-3">
          {options.map((option, i) => {
            const count = Number(voteCounts[i]);
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={i} className="relative">
                <div
                  className="absolute inset-0 bg-accent/10 rounded animate-progress"
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex justify-between px-3 py-1.5 text-sm">
                  <span className="truncate">{option}</span>
                  <span className="text-muted ml-2 shrink-0">
                    {count} {count === 1 ? "vote" : "votes"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-xs text-muted">
          {total} total {total === 1 ? "vote" : "votes"}
        </div>
      </div>
    </Link>
  );
}
