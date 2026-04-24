const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Auction - Full Test Suite", function () {
  let auction, owner, addr1, addr2;

  beforeEach(async () => {
    [owner, addr1, addr2] = await ethers.getSigners();

    const Auction = await ethers.getContractFactory("Auction");
    auction = await Auction.deploy();
  });

  it("should create auction", async () => {
    await auction.createAuction("Phone", "cid", 100, 1000);
    expect(await auction.auctionCount()).to.equal(1);
  });

  it("should return auction id", async () => {
    await auction.createAuction("Phone", "cid", 100, 1000);
    const data = await auction.getAuction(1);

    expect(data[6]).to.equal("Phone"); // FIXED INDEX
  });

  it("should reject empty item name", async () => {
    await expect(
      auction.createAuction("", "cid", 100, 1000)
    ).to.be.revertedWith("Item name should not be empty");
  });

  it("should reject empty ipfs", async () => {
    await expect(
      auction.createAuction("Phone", "", 100, 1000)
    ).to.be.revertedWith("IPFS CID should not be empty");
  });

  it("should reject zero price", async () => {
    await expect(
      auction.createAuction("Phone", "cid", 0, 1000)
    ).to.be.revertedWith("Starting price should be greater than 0");
  });

  it("should reject zero duration", async () => {
    await expect(
      auction.createAuction("Phone", "cid", 100, 0)
    ).to.be.revertedWith("Duration should be greater than 0");
  });

  it("should accept valid bid", async () => {
    await auction.createAuction("Phone", "cid", 100, 1000);

    await auction.connect(addr1).placeBid(1, { value: 200 });

    const data = await auction.getAuction(1);
    expect(data[2]).to.equal(200); // FIXED INDEX
  });

  it("should reject seller bid", async () => {
    await auction.createAuction("Phone", "cid", 100, 1000);

    await expect(
      auction.placeBid(1, { value: 200 })
    ).to.be.revertedWith("Seller cannot bid");
  });

  it("should reject lower bids", async () => {
    await auction.createAuction("Phone", "cid", 100, 1000);

    await auction.connect(addr1).placeBid(1, { value: 200 });

    await expect(
      auction.connect(addr2).placeBid(1, { value: 150 })
    ).to.be.revertedWith("Bid must be greater than current highest bid");
  });

  it("should reject equal bids", async () => {
    await auction.createAuction("Phone", "cid", 100, 1000);

    await auction.connect(addr1).placeBid(1, { value: 200 });

    await expect(
      auction.connect(addr2).placeBid(1, { value: 200 })
    ).to.be.revertedWith("Bid must be greater than current highest bid");
  });

  it("should reject invalid auction", async () => {
    await expect(
      auction.placeBid(99, { value: 200 })
    ).to.be.revertedWith("Auction does not exist");
  });

  it("should move previous bid to pendingReturns", async () => {
    await auction.createAuction("Phone", "cid", 100, 1000);

    await auction.connect(addr1).placeBid(1, { value: 200 });
    await auction.connect(addr2).placeBid(1, { value: 300 });

    const pending = await auction.getPendingReturn(1, addr1.address);
    expect(pending).to.equal(200);
  });

  it("should allow withdraw", async () => {
    await auction.createAuction("Phone", "cid", 100, 1000);

    await auction.connect(addr1).placeBid(1, { value: 200 });
    await auction.connect(addr2).placeBid(1, { value: 300 });

    await auction.connect(addr1).withdrawBid(1);

    const pending = await auction.getPendingReturn(1, addr1.address);
    expect(pending).to.equal(0);
  });

  it("should reject withdraw if no funds", async () => {
    await expect(
      auction.connect(addr1).withdrawBid(1)
    ).to.be.revertedWith("No refundable amount");
  });

  it("should end after deadline", async () => {
    await auction.createAuction("Phone", "cid", 100, 1);

    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine");

    await auction.endAuction(1);

    const data = await auction.getAuction(1);
    expect(data[5]).to.equal(true);
  });

  it("should reject bids after end", async () => {
    await auction.createAuction("Phone", "cid", 100, 1);

    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine");

    await auction.endAuction(1);

    await expect(
      auction.connect(addr1).placeBid(1, { value: 200 })
    ).to.be.revertedWith("Auction already ended");
  });

  it("should support multiple auctions", async () => {
    await auction.createAuction("A1", "cid", 100, 1000);
    await auction.createAuction("A2", "cid", 200, 1000);

    const a1 = await auction.getAuction(1);
    const a2 = await auction.getAuction(2);

    expect(a1[6]).to.equal("A1"); // FIXED
    expect(a2[6]).to.equal("A2");
  });

  it("should revert endAuction before deadline", async () => {
    await auction.createAuction("Phone", "cid", 100, 1000);

    await expect(
      auction.endAuction(1)
    ).to.be.revertedWith("Auction deadline not reached");
  });

  it("seller receives highest bid", async () => {
  // ✅ FIX 1: Give enough duration
  await auction.createAuction("Phone", "cid", 100, 1000);

  // ✅ Place bid BEFORE time ends
  await auction.connect(addr1).placeBid(1, { value: 200 });

  // ✅ FIX 2: Move time AFTER bidding
  await ethers.provider.send("evm_increaseTime", [2000]);
  await ethers.provider.send("evm_mine");

  await auction.endAuction(1);

  // ✅ FIX 3: Check pendingReturns (correct logic)
  const pending = await auction.getPendingReturn(1, owner.address);
  expect(pending).to.equal(200);
});
it("should prevent reentrancy attack", async () => {
  const Attacker = await ethers.getContractFactory("ReentrancyAttacker");
  const attacker = await Attacker.deploy(auction.target);

  // create auction
  await auction.createAuction("Phone", "cid", 100, 1000);

  // attacker places bid
  await attacker.placeAttackBid(1, { value: 200 });

  // someone outbids attacker
  await auction.connect(addr1).placeBid(1, { value: 300 });

  // attack
  await attacker.attackWithdraw(1);

  // attacker should NOT drain funds
  const balance = await attacker.getBalance();
  expect(balance).to.be.lte(200);
});
it("should not allow ending twice", async () => {
  await auction.createAuction("Phone", "cid", 100, 1);

  await ethers.provider.send("evm_increaseTime", [2]);
  await ethers.provider.send("evm_mine");

  await auction.endAuction(1);

  await expect(
    auction.endAuction(1)
  ).to.be.revertedWith("Auction already ended");
});
it("should not allow double withdraw", async () => {
  await auction.createAuction("Phone", "cid", 100, 1000);

  await auction.connect(addr1).placeBid(1, { value: 200 });
  await auction.connect(addr2).placeBid(1, { value: 300 });

  await auction.connect(addr1).withdrawBid(1);

  await expect(
    auction.connect(addr1).withdrawBid(1)
  ).to.be.revertedWith("No refundable amount");
});
});