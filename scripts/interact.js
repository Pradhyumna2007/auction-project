import hre from "hardhat";

async function main() {
  const { ethers } = await hre.network.connect();

  const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  const auction = await ethers.getContractAt("Auction", CONTRACT_ADDRESS);

  console.log("Connected to:", CONTRACT_ADDRESS);

  const tx1 = await auction.createAuction(
    "Laptop",
    "QmFakeCID123",
    ethers.parseEther("1"),
    300
  );
  await tx1.wait();
  console.log("Auction created");

  const tx2 = await auction.placeBid(1, {
    value: ethers.parseEther("2"),
  });
  await tx2.wait();
  console.log("Bid placed");

  const data = await auction.getAuction(1);
  console.log("Auction Data:", data);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});