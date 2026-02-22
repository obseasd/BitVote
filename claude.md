# CONTEXT — Read This First

I am a solo developer with a **12-HOUR deadline**. This is a speed-run "vibe coding" hackathon. You are my technical co-pilot. Your job is to build a WORKING dApp as fast as possible. No over-engineering. No perfection. Ship something that works end-to-end.

## My Tech Stack
- **Strong:** Next.js/React, TypeScript, Solidity/Foundry, ethers.js/viem/wagmi
- **Learning:** Midl SDK (Bitcoin EVM layer), Xverse wallet — first time using these

## Rules
- SPEED IS EVERYTHING. We have 12 hours total.
- The dApp MUST work end-to-end: wallet connect → user action → Solidity contract → tx on Bitcoin → UI updates
- Use Midl SDK (not wagmi/ethers — Midl has its own SDK for Bitcoin)
- Use Xverse wallet (Bitcoin wallet, not MetaMask)
- Frontend must look intentional — not default AI-generated slop. Use a clean dark theme with good typography.
- If something doesn't work after 15 min, simplify or skip it.
- Deploy on Midl Regtest (Bitcoin testnet).

---

# PROJECT — BitVote: Decentralized Polls on Bitcoin

## Concept
BitVote lets anyone create polls and vote using their Bitcoin wallet. Every vote is an on-chain transaction on Bitcoin via Midl. Results update in real-time. Simple, social, transparent.

## Hackathon: Midl VibeHack
- **Prize:** $1,000 grand + Claude Credits top 5 + Xverse dev packs
- **Deadline:** Feb 23, 00:00 UTC (TONIGHT)
- **Judging:** Community vote (top 5) → Council vote (winner)

---

## Stack Technique

| Component | Tech |
|-----------|------|
| Smart Contract | Solidity 0.8.x (single contract) |
| Frontend | Next.js 14 + TypeScript + TailwindCSS |
| Wallet | Xverse (Bitcoin wallet) via Midl SDK |
| Bitcoin Layer | Midl SDK v2 |
| Network | Midl Regtest (Bitcoin testnet) |
| Deploy | Midl tools |

## Key Resources

| Item | URL |
|------|-----|
| Midl SDK Docs | https://v2.js.midl.xyz/docs |
| Midl SDK GitHub | https://github.com/midl-xyz/midl-js |
| Midl SDK npm | https://js.midl.xyz/ |
| Xverse Docs | https://docs.xverse.app/ |
| Regtest Faucet | https://faucet.staging.midl.xyz |
| Bitcoin Explorer | https://mempool.staging.midl.xyz |
| Midl Explorer | https://blockscout.staging.midl.xyz |
| Discord Support | https://discord.com/invite/midl |

---

## Architecture

### Smart Contract (1 file only)

**BitVote.sol**
```solidity
struct Poll {
    string question;
    string[] options;        // max 4 options
    mapping(uint => uint) votes;  // optionIndex => count
    mapping(address => bool) hasVoted;
    address creator;
    uint256 createdAt;
    bool active;
}

// Functions:
- createPoll(string question, string[] options) → pollId
- vote(uint256 pollId, uint256 optionIndex) → emits Voted event
- getPoll(uint256 pollId) → returns question, options, vote counts
- getResults(uint256 pollId) → returns vote counts per option
- totalPolls() → count
```

### Frontend (3 pages)

1. **Home** — List of all polls with vote counts, newest first
2. **Create** — Form to create a new poll (question + 2-4 options)
3. **Vote** — View poll, select option, vote with Xverse wallet, see results update

### Wallet Integration (Midl SDK)

IMPORTANT: Do NOT use wagmi or ethers. Use Midl SDK which wraps Xverse:
- Check https://v2.js.midl.xyz/docs for how to connect wallet
- Check https://github.com/midl-xyz/midl-js for examples
- The SDK handles Bitcoin tx signing via Xverse

---

## Timeline (12 hours)

```
Hours 1-2:   Setup project, read Midl SDK docs, connect Xverse wallet
Hours 3-4:   Write BitVote.sol, deploy on Midl Regtest
Hours 5-7:   Frontend: Home + Create + Vote pages
Hours 8-9:   Polish UI (dark theme, animations, responsive)
Hours 10:    Test full flow, create demo polls, vote
Hours 11:    Record video demo (2-3 min)
Hour 12:     Submit on DoraHacks + post on X
```

---

## Risks & Fallbacks

| If this happens | Do this |
|----------------|---------|
| Midl SDK confusing | Check GitHub examples first, then Discord for help |
| Xverse connection fails | Follow Midl SDK wallet docs exactly, don't try to hack it |
| Deploy on Midl fails | Use their CLI tools or check Discord |
| Not enough time for 3 pages | Merge Home + Vote into 1 page, skip Create (hardcode a poll) |
| Frontend looks bad | Use shadcn/ui components — instant professional look |

---

# INSTRUCTION

FIRST: Read the Midl SDK docs at https://v2.js.midl.xyz/docs and the GitHub repo at https://github.com/midl-xyz/midl-js to understand how wallet connection and contract interaction works. Then initialize the Next.js project and write the BitVote.sol contract. The contract is dead simple — focus on getting the Midl SDK integration working first (wallet connect + send tx).
