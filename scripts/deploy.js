import { network } from "hardhat";

async function main() {
    const { ethers, networkName } = await network.connect();

    console.log(`Deploying Auction to ${networkName}...`);

    const auction = await ethers.deployContract("Auction");
    await auction.waitForDeployment();

    const contractAddress = await auction.getAddress();

    console.log("Auction deployed to:", contractAddress);
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});