"use client";

import Link from "next/link";
import { useAccounts, useConnect, useDisconnect } from "@midl/react";
import { AddressPurpose } from "@midl/core";
import { useState } from "react";

export function Header() {
  const { isConnected, accounts } = useAccounts();
  const ordinals = accounts?.find((a) => a.purpose === "ordinals");
  const { connectors, connect } = useConnect({
    purposes: [AddressPurpose.Ordinals],
  });
  const { disconnect } = useDisconnect();
  const [showMenu, setShowMenu] = useState(false);

  const truncateAddress = (addr: string) =>
    `${addr.slice(0, 8)}...${addr.slice(-4)}`;

  return (
    <header className="border-b border-card-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-xl sm:text-2xl font-bold">
            <span className="text-accent">Bit</span>Vote
          </span>
          <span className="text-[10px] text-muted bg-muted/10 px-1.5 py-0.5 rounded hidden sm:inline">
            on Bitcoin
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/"
            className="text-sm text-muted hover:text-foreground transition-colors hidden sm:block"
          >
            Polls
          </Link>
          {isConnected && (
            <Link
              href="/create"
              className="text-sm text-muted hover:text-foreground transition-colors hidden sm:block"
            >
              Create
            </Link>
          )}

          {isConnected ? (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="bg-card border border-card-border hover:border-accent/40 rounded-lg px-3 py-1.5 text-sm font-mono text-accent transition-colors flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-success" />
                {truncateAddress(ordinals?.address || "")}
              </button>
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 z-50 bg-card border border-card-border rounded-lg shadow-xl py-1 min-w-[160px] animate-fade-in">
                    <Link
                      href="/create"
                      className="block px-4 py-2 text-sm text-foreground hover:bg-accent/10 transition-colors sm:hidden"
                      onClick={() => setShowMenu(false)}
                    >
                      + Create Poll
                    </Link>
                    <button
                      onClick={() => {
                        disconnect();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                const xverse = connectors.find((c) =>
                  c.id.toLowerCase().includes("xverse")
                );
                if (xverse) {
                  connect({ id: xverse.id });
                } else if (connectors.length > 0) {
                  connect({ id: connectors[0].id });
                }
              }}
              className="bg-accent hover:bg-accent-hover text-black font-semibold text-sm px-4 py-1.5 rounded-lg transition-colors"
            >
              Connect Wallet
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
