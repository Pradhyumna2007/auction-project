// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
contract Auction is ReentrancyGuard {

    struct AuctionItem {
        string itemName;
        string ipfsCID;
        address payable seller;
        uint256 highestBid;
        address highestBidder;
        uint256 deadline;
        bool ended;
    }

    uint256 public auctionCount;

    mapping(uint256 => AuctionItem) public auctions;
    mapping(uint256 => mapping(address => uint256)) public pendingReturns;

    event AuctionCreated(uint256 auctionId, string itemName, address seller, uint256 deadline);
    event BidPlaced(uint256 auctionId, address bidder, uint256 amount);
    event AuctionEnded(uint256 auctionId, address winner, uint256 amount);
    event BidWithdrawn(uint256 auctionId, address bidder, uint256 amount);

    // =========================
    // CREATE AUCTION
    // =========================
    function createAuction(
        string memory itemName,
        string memory ipfsCID,
        uint256 startingPrice,
        uint256 durationSeconds
    ) external returns (uint256) {

        require(bytes(itemName).length > 0, "Item name should not be empty");
        require(bytes(ipfsCID).length > 0, "IPFS CID should not be empty");
        require(startingPrice > 0, "Starting price should be greater than 0");
        require(durationSeconds > 0, "Duration should be greater than 0");

        auctionCount++;

        auctions[auctionCount] = AuctionItem({
            itemName: itemName,
            ipfsCID: ipfsCID,
            seller: payable(msg.sender),
            highestBid: startingPrice,
            highestBidder: address(0),
            deadline: block.timestamp + durationSeconds,
            ended: false
        });

        emit AuctionCreated(auctionCount, itemName, msg.sender, auctions[auctionCount].deadline);

        return auctionCount;
    }

    // =========================
    // PLACE BID
    // =========================
    function placeBid(uint256 auctionId) external payable {

        AuctionItem storage auction = auctions[auctionId];

        require(auction.seller != address(0), "Auction does not exist");
        require(msg.sender != auction.seller, "Seller cannot bid"); // 🔥 FIX
        require(!auction.ended, "Auction already ended");
        require(block.timestamp < auction.deadline, "Auction has ended");
        require(msg.value > auction.highestBid, "Bid must be greater than current highest bid");

        // Refund previous highest bidder
        if (auction.highestBidder != address(0)) {
            pendingReturns[auctionId][auction.highestBidder] += auction.highestBid;
        }

        auction.highestBid = msg.value;
        auction.highestBidder = msg.sender;

        emit BidPlaced(auctionId, msg.sender, msg.value);
    }

    // =========================
    // WITHDRAW BID
    // =========================
    function withdrawBid(uint256 auctionId) external nonReentrant {

        uint256 amount = pendingReturns[auctionId][msg.sender];

        require(amount > 0, "No refundable amount");

        pendingReturns[auctionId][msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");

        emit BidWithdrawn(auctionId, msg.sender, amount);
    }

    // =========================
    // END AUCTION
    // =========================
    function endAuction(uint256 auctionId) external {

        AuctionItem storage auction = auctions[auctionId];

        require(auction.seller != address(0), "Auction does not exist");
        require(block.timestamp >= auction.deadline, "Auction deadline not reached");
        require(!auction.ended, "Auction already ended");

        auction.ended = true;

        // Transfer funds to seller
        if (auction.highestBidder != address(0)) {
            (bool success, ) = auction.seller.call{value: auction.highestBid}("");
            require(success, "Transfer failed");
        }

        emit AuctionEnded(auctionId, auction.highestBidder, auction.highestBid);
    }

    // =========================
    // GET AUCTION
    // =========================
    function getAuction(uint256 auctionId)
        external
        view
        returns (
            string memory,
            string memory,
            address,
            uint256,
            address,
            uint256,
            bool
        )
    {
        AuctionItem memory auction = auctions[auctionId];

        require(auction.seller != address(0), "Auction does not exist");

        return (
            auction.itemName,
            auction.ipfsCID,
            auction.seller,
            auction.highestBid,
            auction.highestBidder,
            auction.deadline,
            auction.ended
        );
    }
}
