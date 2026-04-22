const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
describe("Auction - Full Test Suite", function () {

    let Auction, auction;
    let owner, seller, bidder1, bidder2, bidder3;

    beforeEach(async function () {
        [owner, seller, bidder1, bidder2, bidder3] = await ethers.getSigners();

        Auction = await ethers.getContractFactory("Auction");
        auction = await Auction.deploy();
        await auction.waitForDeployment();
    });

    // ---------------- CREATE AUCTION ----------------

    it("should create auction", async function () {
        const tx = await auction.connect(seller).createAuction(
            "Laptop",
            "Qm123",
            ethers.parseEther("1"),
            3600
        );

        const receipt = await tx.wait();
        expect(receipt.status).to.equal(1);
    });

    it("should return auction id", async function () {
        await auction.connect(seller).createAuction(
            "Phone",
            "Qm456",
            ethers.parseEther("1"),
            3600
        );

        const data = await auction.getAuction(1);
        expect(data[0]).to.equal("Phone");
    });

    it("should reject empty item name", async function () {
        await expect(
            auction.connect(seller).createAuction(
                "",
                "Qm123",
                ethers.parseEther("1"),
                3600
            )
        ).to.be.revertedWith("Item name should not be empty");
    });

    it("should reject empty ipfs", async function () {
        await expect(
            auction.connect(seller).createAuction(
                "Laptop",
                "",
                ethers.parseEther("1"),
                3600
            )
        ).to.be.revertedWith("IPFS CID should not be empty");
    });

    it("should reject zero price", async function () {
        await expect(
            auction.connect(seller).createAuction(
                "Laptop",
                "Qm123",
                0,
                3600
            )
        ).to.be.revertedWith("Starting price should be greater than 0");
    });

    it("should reject zero duration", async function () {
        await expect(
            auction.connect(seller).createAuction(
                "Laptop",
                "Qm123",
                ethers.parseEther("1"),
                0
            )
        ).to.be.revertedWith("Duration should be greater than 0");
    });

    // ---------------- BIDDING ----------------

    it("should accept valid bid", async function () {
        await auction.connect(seller).createAuction(
            "Laptop",
            "Qm123",
            ethers.parseEther("1"),
            3600
        );

        await auction.connect(bidder1).placeBid(1, {
            value: ethers.parseEther("2")
        });

        const data = await auction.getAuction(1);
        expect(data[4]).to.equal(bidder1.address);
    });

    it("should reject seller bid", async function () {
        await auction.connect(seller).createAuction(
            "Laptop",
            "Qm123",
            ethers.parseEther("1"),
            3600
        );

        await expect(
            auction.connect(seller).placeBid(1, {
                value: ethers.parseEther("2")
            })
        ).to.be.revertedWith("Seller cannot bid");
    });

    it("should reject lower bids", async function () {
        await auction.connect(seller).createAuction(
            "Laptop",
            "Qm123",
            ethers.parseEther("1"),
            3600
        );

        await auction.connect(bidder1).placeBid(1, {
            value: ethers.parseEther("2")
        });

        await expect(
            auction.connect(bidder2).placeBid(1, {
                value: ethers.parseEther("1.5")
            })
        ).to.be.revertedWith("Bid must be greater than current highest bid");
    });

    it("should reject equal bids", async function () {
        await auction.connect(seller).createAuction(
            "Laptop",
            "Qm123",
            ethers.parseEther("1"),
            3600
        );

        await auction.connect(bidder1).placeBid(1, {
            value: ethers.parseEther("2")
        });

        await expect(
            auction.connect(bidder2).placeBid(1, {
                value: ethers.parseEther("2")
            })
        ).to.be.revertedWith("Bid must be greater than current highest bid");
    });

    it("should reject invalid auction", async function () {
        await expect(
            auction.connect(bidder1).placeBid(99, {
                value: ethers.parseEther("1")
            })
        ).to.be.revertedWith("Auction does not exist");
    });

    it("should move previous bid to pendingReturns", async function () {
        await auction.connect(seller).createAuction(
            "Laptop",
            "Qm123",
            ethers.parseEther("1"),
            3600
        );

        await auction.connect(bidder1).placeBid(1, {
            value: ethers.parseEther("2")
        });

        await auction.connect(bidder2).placeBid(1, {
            value: ethers.parseEther("3")
        });

        const amount = await auction.getPendingReturn(1, bidder1.address);
        expect(amount).to.equal(ethers.parseEther("2"));
    });

    it("should allow withdraw", async function () {
        await auction.connect(seller).createAuction(
            "Laptop",
            "Qm123",
            ethers.parseEther("1"),
            3600
        );

        await auction.connect(bidder1).placeBid(1, {
            value: ethers.parseEther("2")
        });

        await auction.connect(bidder2).placeBid(1, {
            value: ethers.parseEther("3")
        });

        await auction.connect(bidder1).withdrawBid(1);
    });

    it("should reject withdraw if no funds", async function () {
        await auction.connect(seller).createAuction(
            "Laptop",
            "Qm123",
            ethers.parseEther("1"),
            3600
        );

        await expect(
            auction.connect(bidder1).withdrawBid(1)
        ).to.be.revertedWith("No refundable amount");
    });

    // ---------------- END AUCTION ----------------

    it("should end after deadline", async function () {
    const Auction = await ethers.getContractFactory("Auction");
const auction = await Auction.deploy();
await auction.waitForDeployment();

    const tx = await auction.createAuction("item", "cid", ethers.parseEther("1"), 60);
    const receipt = await tx.wait();
    const auctionId = 1;

    // move time forward
    await network.provider.send("evm_increaseTime", [70]);
    await network.provider.send("evm_mine");

    await expect(auction.endAuction(auctionId))
        .to.emit(auction, "AuctionEnded");

    const data = await auction.getAuction(auctionId);
    expect(data.ended).to.equal(true);
});
    it("should reject bids after end", async function () {
        await auction.connect(seller).createAuction(
            "Laptop",
            "Qm123",
            ethers.parseEther("1"),
            1
        );

        await ethers.provider.send("evm_increaseTime", [2]);
        await ethers.provider.send("evm_mine");

        await auction.connect(seller).endAuction(1);

        await expect(
            auction.connect(bidder1).placeBid(1, {
                value: ethers.parseEther("2")
            })
        ).to.be.revertedWith("Auction already ended");
    });

    // ---------------- MULTI AUCTION ----------------

    it("should support multiple auctions", async function () {
        await auction.connect(seller).createAuction(
            "A1",
            "Qm1",
            ethers.parseEther("1"),
            3600
        );

        await auction.connect(seller).createAuction(
            "A2",
            "Qm2",
            ethers.parseEther("1"),
            3600
        );

        const a1 = await auction.getAuction(1);
        const a2 = await auction.getAuction(2);

        expect(a1[0]).to.equal("A1");
        expect(a2[0]).to.equal("A2");
    });

    // ---------------- REENTRANCY ----------------

    it("should prevent reentrancy attack", async function () {

    // create auction
    await auction.connect(seller).createAuction(
        "Laptop",
        "CID",
        ethers.parseEther("1"),
        1000
    );

    // deploy attacker
    const Attacker = await ethers.getContractFactory("ReentrancyAttacker");
    const attacker = await Attacker.deploy(await auction.getAddress());
    await attacker.waitForDeployment();

    // attacker places bid
    await attacker.placeAttackBid(1, {
        value: ethers.parseEther("2")
    });

    // someone outbids attacker
    await auction.connect(bidder1).placeBid(1, {
        value: ethers.parseEther("3")
    });

    // attacker tries reentrancy
    await attacker.attackWithdraw(1);

    const balance = await attacker.getBalance();

    // SHOULD ONLY GET ORIGINAL BID BACK
    expect(balance).to.equal(ethers.parseEther("2"));
});

    it("should revert endAuction before deadline", async function () {
    await auction.connect(seller).createAuction(
        "Laptop",
        "CID",
        ethers.parseEther("1"),
        1000
    );

    await expect(
        auction.endAuction(1)
    ).to.be.revertedWith("Auction deadline not reached");
});
it("seller receives highest bid", async function () {
    await auction.connect(seller).createAuction(
        "Laptop",
        "CID",
        ethers.parseEther("1"),
        2
    );

    await auction.connect(bidder1).placeBid(1, {
        value: ethers.parseEther("2")
    });

    await ethers.provider.send("evm_increaseTime", [3]);
    await ethers.provider.send("evm_mine");

    const before = await ethers.provider.getBalance(seller.address);

    await auction.endAuction(1);

    const after = await ethers.provider.getBalance(seller.address);

    expect(after).to.be.gt(before);
});

});