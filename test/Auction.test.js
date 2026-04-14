import { expect } from "chai";
import { network } from "hardhat";

describe("Auction - Full Test Suite", function () {
    let auction;
    let attacker;
    let owner, seller, bidder1, bidder2, bidder3;
    let ethers;
    let networkHelpers;

    beforeEach(async function () {
        const connection = await network.connect();
        ethers = connection.ethers;
        networkHelpers = connection.networkHelpers;

        [owner, seller, bidder1, bidder2, bidder3] = await ethers.getSigners();

        const Auction = await ethers.getContractFactory("Auction");
        auction = await Auction.deploy();
        await auction.waitForDeployment();

        const ReentrancyAttacker = await ethers.getContractFactory("ReentrancyAttacker");
        attacker = await ReentrancyAttacker.connect(bidder3).deploy(await auction.getAddress());
        await attacker.waitForDeployment();
    });

    async function createAuction() {
        await auction.connect(seller).createAuction(
            "Laptop",
            "QmTestCID123",
            ethers.parseEther("1"),
            3600
        );
    }

    // =========================
    // CREATE AUCTION
    // =========================
    it("should create auction", async function () {
        await createAuction();
        const result = await auction.getAuction(1);

        expect(result[0]).to.equal("Laptop");
        expect(result[1]).to.equal("QmTestCID123");
        expect(result[2]).to.equal(seller.address);
        expect(result[3]).to.equal(ethers.parseEther("1"));
        expect(result[4]).to.equal(ethers.ZeroAddress);
        expect(result[6]).to.equal(false);
    });

    it("should return auction id", async function () {
        await createAuction();
        expect(await auction.auctionCount()).to.equal(1n);
    });

    it("should reject empty item name", async function () {
        await expect(
            auction.connect(seller).createAuction("", "CID", ethers.parseEther("1"), 100)
        ).to.be.revertedWith("Item name should not be empty");
    });

    it("should reject empty ipfs", async function () {
        await expect(
            auction.connect(seller).createAuction("Item", "", ethers.parseEther("1"), 100)
        ).to.be.revertedWith("IPFS CID should not be empty");
    });

    it("should reject zero price", async function () {
        await expect(
            auction.connect(seller).createAuction("Item", "CID", 0, 100)
        ).to.be.revertedWith("Starting price should be greater than 0");
    });

    it("should reject zero duration", async function () {
        await expect(
            auction.connect(seller).createAuction("Item", "CID", ethers.parseEther("1"), 0)
        ).to.be.revertedWith("Duration should be greater than 0");
    });

    // =========================
    // BIDDING
    // =========================
    it("should accept valid bid", async function () {
        await createAuction();

        await auction.connect(bidder1).placeBid(1, {
            value: ethers.parseEther("2")
        });

        const result = await auction.getAuction(1);
        expect(result[4]).to.equal(bidder1.address);
    });

    it("should reject seller bid", async function () {
        await createAuction();

        await expect(
            auction.connect(seller).placeBid(1, {
                value: ethers.parseEther("2")
            })
        ).to.be.revertedWith("Seller cannot bid");
    });

    it("should reject lower bids", async function () {
        await createAuction();

        await auction.connect(bidder1).placeBid(1, { value: ethers.parseEther("2") });

        await expect(
            auction.connect(bidder2).placeBid(1, { value: ethers.parseEther("1.5") })
        ).to.be.revertedWith("Bid must be greater than current highest bid");
    });

    it("should reject equal bids", async function () {
        await createAuction();

        await auction.connect(bidder1).placeBid(1, { value: ethers.parseEther("2") });

        await expect(
            auction.connect(bidder2).placeBid(1, { value: ethers.parseEther("2") })
        ).to.be.revertedWith("Bid must be greater than current highest bid");
    });

    it("should reject bid equal to starting price", async function () {
        await createAuction();

        await expect(
            auction.connect(bidder1).placeBid(1, { value: ethers.parseEther("1") })
        ).to.be.revertedWith("Bid must be greater than current highest bid");
    });

    it("should reject invalid auction", async function () {
        await expect(
            auction.connect(bidder1).placeBid(999, { value: ethers.parseEther("2") })
        ).to.be.revertedWith("Auction does not exist");
    });

    it("should move previous bid to pendingReturns", async function () {
        await createAuction();

        await auction.connect(bidder1).placeBid(1, { value: ethers.parseEther("2") });
        await auction.connect(bidder2).placeBid(1, { value: ethers.parseEther("3") });

        expect(await auction.pendingReturns(1, bidder1.address))
            .to.equal(ethers.parseEther("2"));
    });

    // =========================
    // WITHDRAW
    // =========================
    it("should allow withdraw", async function () {
        await createAuction();

        await auction.connect(bidder1).placeBid(1, { value: ethers.parseEther("2") });
        await auction.connect(bidder2).placeBid(1, { value: ethers.parseEther("3") });

        await auction.connect(bidder1).withdrawBid(1);
    });

    it("should reject withdraw if no funds", async function () {
        await createAuction();

        await expect(
            auction.connect(bidder1).withdrawBid(1)
        ).to.be.revertedWith("No refundable amount");
    });

    it("should prevent double withdraw", async function () {
        await createAuction();

        await auction.connect(bidder1).placeBid(1, { value: ethers.parseEther("2") });
        await auction.connect(bidder2).placeBid(1, { value: ethers.parseEther("3") });

        await auction.connect(bidder1).withdrawBid(1);

        await expect(
            auction.connect(bidder1).withdrawBid(1)
        ).to.be.revertedWith("No refundable amount");
    });

    it("should revert withdraw on invalid auction", async function () {
        await expect(
            auction.connect(bidder1).withdrawBid(999)
        ).to.be.revertedWith("No refundable amount");
    });

    // =========================
    // END AUCTION
    // =========================
    it("should not end before deadline", async function () {
        await createAuction();

        await expect(
            auction.endAuction(1)
        ).to.be.revertedWith("Auction deadline not reached");
    });

    it("should end after deadline", async function () {
        await createAuction();

        const result = await auction.getAuction(1);
        await networkHelpers.time.increaseTo(Number(result[5]) + 1);

        await auction.endAuction(1);

        const updated = await auction.getAuction(1);
        expect(updated[6]).to.equal(true);
    });

    it("should reject double end", async function () {
        await createAuction();

        const result = await auction.getAuction(1);
        await networkHelpers.time.increaseTo(Number(result[5]) + 1);

        await auction.endAuction(1);

        await expect(
            auction.endAuction(1)
        ).to.be.revertedWith("Auction already ended");
    });

    it("should reject end invalid auction", async function () {
        await expect(
            auction.endAuction(999)
        ).to.be.revertedWith("Auction does not exist");
    });

    // =========================
    // POST END BEHAVIOR
    // =========================
    it("should reject bids after end", async function () {
        await createAuction();

        const result = await auction.getAuction(1);
        await networkHelpers.time.increaseTo(Number(result[5]) + 1);
        await auction.endAuction(1);

        await expect(
            auction.connect(bidder1).placeBid(1, { value: ethers.parseEther("2") })
        ).to.be.revertedWith("Auction already ended");
    });

    // =========================
    // MULTI AUCTION
    // =========================
    it("should support multiple auctions", async function () {
        await createAuction();

        await auction.connect(owner).createAuction(
            "Phone",
            "CID2",
            ethers.parseEther("2"),
            3600
        );

        await auction.connect(bidder1).placeBid(1, { value: ethers.parseEther("2") });
        await auction.connect(bidder2).placeBid(2, { value: ethers.parseEther("3") });

        const a1 = await auction.getAuction(1);
        const a2 = await auction.getAuction(2);

        expect(a1[4]).to.equal(bidder1.address);
        expect(a2[4]).to.equal(bidder2.address);
    });

    // =========================
    // SECURITY
    // =========================
    it("should prevent reentrancy attack", async function () {
    await createAuction();

    await attacker.connect(bidder3).placeAttackBid(1, {
        value: ethers.parseEther("2")
    });

    await auction.connect(bidder1).placeBid(1, {
        value: ethers.parseEther("3")
    });

    await expect(
        attacker.connect(bidder3).attackWithdraw(1)
    ).to.be.revert(ethers);
});
});