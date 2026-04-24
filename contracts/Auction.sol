// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title Auction Contract
/// @author Pradhyumna
/// @notice A decentralized auction system with bidding, withdrawal, and time-based closure
/// @dev Uses pull-over-push payment pattern + reentrancy protection

contract Auction is ReentrancyGuard {

    /// @notice Stores all details of an auction item
    struct AuctionItem {
        address payable seller;      // Auction creator
        address highestBidder;      // Current highest bidder

        uint96 highestBid;          // Current highest bid amount (gas optimized)
        uint96 startingPrice;       // Minimum starting price (gas optimized)
        uint64 deadline;            // Auction end timestamp (gas optimized)

        bool ended;                 // Whether auction is finalized

        string itemName;            // Name of item (off-chain reference)
        string ipfsCID;             // IPFS hash for metadata/image
    }

    /// @notice Total number of auctions created
    uint256 public auctionCount;

    /// @notice Mapping from auction ID to auction details
    mapping(uint256 => AuctionItem) public auctions;

    /// @notice Tracks refundable bids for each user per auction
    mapping(uint256 => mapping(address => uint256)) public pendingReturns;

    /// @notice Emitted when a new auction is created
    event AuctionCreated(uint256 indexed auctionId, address indexed seller);

    /// @notice Emitted when a bid is placed
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount);

    /// @notice Emitted when auction ends
    event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 amount);

    /// @notice Creates a new auction
    /// @param _itemName Name of the item being auctioned
    /// @param _ipfsCID IPFS hash containing metadata or image
    /// @param _startingPrice Minimum bid required to start auction
    /// @param _duration Duration of auction in seconds
    function createAuction(
        string calldata _itemName,
        string calldata _ipfsCID,
        uint256 _startingPrice,
        uint256 _duration
    ) external {

        require(bytes(_itemName).length > 0, "Item name should not be empty");
        require(bytes(_ipfsCID).length > 0, "IPFS CID should not be empty");
        require(_startingPrice > 0, "Starting price should be greater than 0");
        require(_duration > 0, "Duration should be greater than 0");

        uint256 id = ++auctionCount;

        auctions[id] = AuctionItem({
            seller: payable(msg.sender),
            highestBidder: address(0),
            highestBid: 0,
            startingPrice: uint96(_startingPrice),
            deadline: uint64(block.timestamp + _duration),
            ended: false,
            itemName: _itemName,
            ipfsCID: _ipfsCID
        });

        emit AuctionCreated(id, msg.sender);
    }

    /// @notice Place a bid on an active auction
    /// @param _auctionId ID of the auction
    function placeBid(uint256 _auctionId) external payable nonReentrant {

        require(_auctionId > 0 && _auctionId <= auctionCount, "Auction does not exist");

        AuctionItem storage a = auctions[_auctionId];

        require(!a.ended, "Auction already ended");
        require(block.timestamp < a.deadline, "Auction already ended");
        require(msg.sender != a.seller, "Seller cannot bid");

        uint256 minBid = a.highestBid > 0 ? a.highestBid : a.startingPrice;
        require(msg.value > minBid, "Bid must be greater than current highest bid");

        address prevBidder = a.highestBidder;
        uint256 prevBid = a.highestBid;

        a.highestBidder = msg.sender;
        a.highestBid = uint96(msg.value);

        if (prevBidder != address(0)) {
            pendingReturns[_auctionId][prevBidder] += prevBid;
        }

        emit BidPlaced(_auctionId, msg.sender, msg.value);
    }

    /// @notice Withdraw previously outbid funds
    /// @param _auctionId ID of the auction
    function withdrawBid(uint256 _auctionId) external nonReentrant {

        uint256 amount = pendingReturns[_auctionId][msg.sender];
        require(amount > 0, "No refundable amount");

        pendingReturns[_auctionId][msg.sender] = 0;

        (bool success,) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
    }

    /// @notice Ends an auction after deadline
    /// @param _auctionId ID of the auction
    function endAuction(uint256 _auctionId) external nonReentrant {

        require(_auctionId > 0 && _auctionId <= auctionCount, "Auction does not exist");

        AuctionItem storage a = auctions[_auctionId];

        require(!a.ended, "Auction already ended");
        require(block.timestamp >= a.deadline, "Auction deadline not reached");

        a.ended = true;

        if (a.highestBid > 0) {
            pendingReturns[_auctionId][a.seller] += a.highestBid;
        }

        emit AuctionEnded(_auctionId, a.highestBidder, a.highestBid);
    }

    /// @notice Returns auction details
    /// @param _auctionId ID of auction
    /// @return AuctionItem struct containing all auction data
    function getAuction(uint256 _auctionId) external view returns (AuctionItem memory) {
        require(_auctionId > 0 && _auctionId <= auctionCount, "Auction does not exist");
        return auctions[_auctionId];
    }

    /// @notice Returns refundable balance for a user in an auction
    /// @param _auctionId ID of auction
    /// @param user Address of bidder
    /// @return refundable amount in wei
    function getPendingReturn(uint256 _auctionId, address user) external view returns (uint256) {
        return pendingReturns[_auctionId][user];
    }
}