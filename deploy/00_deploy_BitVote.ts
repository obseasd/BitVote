import type { DeployFunction } from "hardhat-deploy/types";

const deploy: DeployFunction = async (hre) => {
  console.log("Initializing Midl...");
  await hre.midl.initialize();

  console.log("Deploying BitVote...");
  const result = await hre.midl.deploy("BitVote");
  console.log("BitVote prepared at:", result?.address);

  console.log("Executing transaction...");
  const txResult = await hre.midl.execute();
  console.log("Deploy complete!");
  console.log("BTC TX:", txResult?.[0]);
  console.log("EVM TXs:", txResult?.[1]);

  const deployment = hre.midl.get("BitVote");
  console.log("\n=== DEPLOYED ===");
  console.log("Contract Address:", deployment?.address);
  console.log("================\n");
};

deploy.tags = ["BitVote"];
export default deploy;
