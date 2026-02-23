/**
 * Mock poll data for demo mode when the Midl chain is unreachable.
 * This allows the app to showcase its UI during hackathon demos.
 */

export interface MockPoll {
  question: string;
  options: string[];
  voteCounts: bigint[];
  creator: string;
  createdAt: bigint;
  active: boolean;
  totalVotes: bigint;
}

export const MOCK_POLLS: MockPoll[] = [
  {
    question: "Best Bitcoin L2?",
    options: ["Midl Protocol", "Lightning Network", "Stacks", "RSK"],
    voteCounts: [42n, 28n, 15n, 8n],
    creator: "0x37aa2A59653C3c93367340af75229F0D91F7fa9b",
    createdAt: BigInt(Math.floor(Date.now() / 1000) - 86400),
    active: true,
    totalVotes: 93n,
  },
  {
    question: "Will BTC hit 200K in 2026?",
    options: ["Yes, easily", "Maybe by EOY", "Not this cycle", "Already there"],
    voteCounts: [67n, 45n, 22n, 12n],
    creator: "0xA353C496787AB3a041A5377192Bbd37fc780D8a2",
    createdAt: BigInt(Math.floor(Date.now() / 1000) - 43200),
    active: true,
    totalVotes: 146n,
  },
  {
    question: "What should Midl build next?",
    options: ["NFT marketplace", "DEX", "Lending protocol", "Social platform"],
    voteCounts: [31n, 54n, 38n, 19n],
    creator: "0x37aa2A59653C3c93367340af75229F0D91F7fa9b",
    createdAt: BigInt(Math.floor(Date.now() / 1000) - 7200),
    active: true,
    totalVotes: 142n,
  },
  {
    question: "Favorite Bitcoin conference 2026?",
    options: ["Bitcoin Amsterdam", "Bitcoin Nashville", "BTC Prague"],
    voteCounts: [25n, 48n, 33n],
    creator: "0x1508fe9b038f69f0f1dece38adf015315f8e71e6",
    createdAt: BigInt(Math.floor(Date.now() / 1000) - 3600),
    active: true,
    totalVotes: 106n,
  },
];
