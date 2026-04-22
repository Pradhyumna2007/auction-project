// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title Decentralized Auction Contract
/// @notice Allows users to create auctions, place bids, withdraw refunds, and finalize auctions
/// @dev Uses pull-payment pattern for refunds and ReentrancyGuard for security
contract Auction is ReentrancyGuard {

    /// @notice Represents a single auction item
    /// @param seller Address of the auction creator
    /// @param highestBidder Address of the current highest bidder
    /// @param highestBid Current highest bid amount
    /// @param startingPrice Minimum starting price for bidding
    /// @param deadline Timestamp when auction ends
    /// @param ended Whether the auction has been finalized
    /// @param itemName Name of the item being auctioned
    /// @param ipfsCID IPFS CID storing item metadata
    struct AuctionItem {
        address payable seller;
        address highestBidder;
        uint256 highestBid;
        uint256 startingPrice;
        uint256 deadline;
        bool ended;
        string itemName;
        string ipfsCID;
    }

    /// @notice Total number of auctions created
    uint256 public auctionCount;

    /// @dev Mapping from auction ID to AuctionItem
    mapping(uint256 => AuctionItem) private auctions;

    /// @dev Tracks refundable bids per auction per user
    mapping(uint256 => mapping(address => uint256)) private pendingReturns;

    /// @notice Emitted when a new auction is created
    /// @param auctionId Unique ID of the auction
    /// @param itemName Name of the item
    /// @param seller Address of the seller
    /// @param deadline Auction end time
    event AuctionCreated(uint256 auctionId, string itemName, address seller, uint256 deadline);

    /// @notice Emitted when a bid is placed
    /// @param auctionId Auction ID
    /// @param bidder Address of bidder
    /// @param amount Bid amount
    event BidPlaced(uint256 auctionId, address bidder, uint256 amount);

    /// @notice Emitted when an auction ends
    /// @param auctionId Auction ID
    /// @param winner Address of the winner
    /// @param amount Final bid amount
    event AuctionEnded(uint256 auctionId, address winner, uint256 amount);

    /// @notice Emitted when a user withdraws their pending return
    /// @param auctionId Auction ID
    /// @param bidder Address of the user
    /// @param amount Amount withdrawn
    event BidWithdrawn(uint256 auctionId, address bidder, uint256 amount);

    /*//////////////////////////////////////////////////////////////
                            CREATE AUCTION
    //////////////////////////////////////////////////////////////*/

    /// @notice Creates a new auction
    /// @param itemName Name of the item
    /// @param ipfsCID IPFS CID for metadata
    /// @param startingPrice Minimum starting bid
    /// @param durationSeconds Duration of auction in seconds
    /// @return id ID of the created auction
    function createAuction(
        string calldata itemName,
        string calldata ipfsCID,
        uint256 startingPrice,
        uint256 durationSeconds
    ) external returns (uint256 id) {

        require(bytes(itemName).length > 0, "Item name should not be empty");
        require(bytes(ipfsCID).length > 0, "IPFS CID should not be empty");
        require(startingPrice > 0, "Starting price should be greater than 0");
        require(durationSeconds > 0, "Duration should be greater than 0");

        id = ++auctionCount;

        AuctionItem storage a = auctions[id];

        a.seller = payable(msg.sender);
        a.startingPrice = startingPrice;
        a.deadline = block.timestamp + durationSeconds;
        a.itemName = itemName;
        a.ipfsCID = ipfsCID;

        emit AuctionCreated(id, itemName, msg.sender, a.deadline);
    }

    /*//////////////////////////////////////////////////////////////
                                BID
    //////////////////////////////////////////////////////////////*/

    /// @notice Places a bid on an auction
    /// @param auctionId ID of the auction
    /// @dev Refunds previous highest bidder using pendingReturns mapping
    function placeBid(uint256 auctionId) external payable {

        AuctionItem storage a = auctions[auctionId];

        require(a.seller != address(0), "Auction does not exist");
        require(!a.ended, "Auction already ended");
        require(msg.sender != a.seller, "Seller cannot bid");
        require(block.timestamp < a.deadline, "Auction has ended");

        uint256 highestBid = a.highestBid;

        if (highestBid == 0) {
            require(msg.value >= a.startingPrice, "Bid must be >= starting price");
        } else {
            require(msg.value > highestBid, "Bid must be greater than current highest bid");
        }

        if (a.highestBidder != address(0)) {
            pendingReturns[auctionId][a.highestBidder] += highestBid;
        }

        a.highestBidder = msg.sender;
        a.highestBid = msg.value;

        emit BidPlaced(auctionId, msg.sender, msg.value);
    }

    /*//////////////////////////////////////////////////////////////
                        PENDING RETURNS VIEW
    //////////////////////////////////////////////////////////////*/

    /// @notice Returns pending refund amount for a user
    /// @param auctionId ID of the auction
    /// @param user Address of the user
    /// @return Amount available for withdrawal
    function getPendingReturn(uint256 auctionId, address user)
        external
        view
        returns (uint256)
    {
        return pendingReturns[auctionId][user];
    }

    /*//////////////////////////////////////////////////////////////
                            WITHDRAW
    //////////////////////////////////////////////////////////////*/

    /// @notice Withdraws previously outbid amount
    /// @param auctionId ID of the auction
    /// @dev Uses nonReentrant modifier to prevent reentrancy attacks
    function withdrawBid(uint256 auctionId) external nonReentrant {

        uint256 amount = pendingReturns[auctionId][msg.sender];

        require(amount > 0, "No refundable amount");

        pendingReturns[auctionId][msg.sender] = 0;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit BidWithdrawn(auctionId, msg.sender, amount);
    }

    /*//////////////////////////////////////////////////////////////
                            END AUCTION
    //////////////////////////////////////////////////////////////*/

    /// @notice Ends an auction and transfers funds to the seller
    /// @param auctionId ID of the auction
    /// @dev Can only be called after deadline
    function endAuction(uint256 auctionId) external nonReentrant {

        AuctionItem storage a = auctions[auctionId];

        require(a.seller != address(0), "Auction does not exist");
        require(block.timestamp >= a.deadline, "Auction deadline not reached");
        require(!a.ended, "Auction already ended");

        a.ended = true;

        if (a.highestBidder != address(0)) {
            (bool success, ) = a.seller.call{value: a.highestBid}("");
            require(success, "Transfer failed");
        }

        emit AuctionEnded(auctionId, a.highestBidder, a.highestBid);
    }

    /*//////////////////////////////////////////////////////////////
                                VIEW
    //////////////////////////////////////////////////////////////*/

    /// @notice Returns details of an auction
    /// @param auctionId ID of the auction
    /// @return itemName Name of item
    /// @return ipfsCID IPFS CID
    /// @return seller Seller address
    /// @return highestBid Current highest bid
    /// @return highestBidder Current highest bidder
    /// @return startingPrice Starting price
    /// @return deadline Auction end time
    /// @return ended Whether auction is finished
    function getAuction(uint256 auctionId)
        external
        view
        returns (
            string memory itemName,
            string memory ipfsCID,
            address seller,
            uint256 highestBid,
            address highestBidder,
            uint256 startingPrice,
            uint256 deadline,
            bool ended
        )
    {
        AuctionItem storage a = auctions[auctionId];

        require(a.seller != address(0), "Auction does not exist");

        return (
            a.itemName,
            a.ipfsCID,
            a.seller,
            a.highestBid,
            a.highestBidder,
            a.startingPrice,
            a.deadline,
            a.ended
        );
    }
}