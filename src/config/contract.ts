// BitVote contract ABI and address
// Deployed on Midl Regtest - Block 49352
export const BITVOTE_ADDRESS = "0x52811d6cde323a58b65f602bf4c90a9ebda5d95f" as const;

export const BITVOTE_ABI = [
  {
    type: "function",
    name: "totalPolls",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "createPoll",
    inputs: [
      { name: "_question", type: "string", internalType: "string" },
      { name: "_options", type: "string[]", internalType: "string[]" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "vote",
    inputs: [
      { name: "_pollId", type: "uint256", internalType: "uint256" },
      { name: "_optionIndex", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getPoll",
    inputs: [
      { name: "_pollId", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      { name: "question", type: "string", internalType: "string" },
      { name: "options", type: "string[]", internalType: "string[]" },
      { name: "voteCounts", type: "uint256[]", internalType: "uint256[]" },
      { name: "creator", type: "address", internalType: "address" },
      { name: "createdAt", type: "uint256", internalType: "uint256" },
      { name: "active", type: "bool", internalType: "bool" },
      { name: "totalVoteCount", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "closePoll",
    inputs: [
      { name: "_pollId", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "votes",
    inputs: [
      { name: "", type: "uint256", internalType: "uint256" },
      { name: "", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasVoted",
    inputs: [
      { name: "", type: "uint256", internalType: "uint256" },
      { name: "", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "PollCreated",
    inputs: [
      { name: "pollId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "question", type: "string", indexed: false, internalType: "string" },
      { name: "options", type: "string[]", indexed: false, internalType: "string[]" },
      { name: "creator", type: "address", indexed: false, internalType: "address" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Voted",
    inputs: [
      { name: "pollId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "optionIndex", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "voter", type: "address", indexed: false, internalType: "address" },
    ],
    anonymous: false,
  },
] as const;
