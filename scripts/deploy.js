const hre = require("hardhat");

async function main() {
  const Auction = await hre.ethers.getContractFactory("Auction");

  const auction = await Auction.deploy();

  await auction.waitForDeployment();

  console.log("Auction deployed to:", await auction.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});