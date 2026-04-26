# Auctra – Decentralized Auction System

**Project Number:** _Project 5_

Auctra is a blockchain-based decentralized auction platform built on Ethereum. It allows users to create auctions, place bids through MetaMask wallets, securely withdraw refundable bids, and finalize auctions automatically using smart contracts without relying on any centralized third party.

---

## **Team Name**

**Stranger bitz**

---

## **Team Members**

| S.No | Name | Roll Number |
|------|------|-------------|
| 1 | Gujjula Siri Sahasra | _240001032_ |
| 2 | Paruchuri Bhavya Sri | _240001049_ |
| 3 | Gopisetti Pradhyumna | _240041018_ |
| 4 | Chandana Lakshmi Subhadra | _240041009_ |
| 5 | Menni Hima Harika | _240001046_ |

---

## **Project Objective**

To develop a secure and transparent decentralized auction platform where users can create auctions and place bids directly through blockchain smart contracts without intermediaries.

---

## **Key Features**

- Create auctions using smart contracts  
- Secure bidding using MetaMask wallets  
- Automatic highest bidder tracking  
- Refund support for outbid users  
- Auction finalization after deadline  
- Decentralized image and metadata storage using IPFS  
- Reentrancy attack protection  
- Gas-optimized smart contract design  

---

## **Tech Stack**

- Solidity `^0.8.20`
- Hardhat
- OpenZeppelin Contracts
- Node.js
- React.js
- Ethers.js
- MetaMask
- Pinata + IPFS
- Ethereum Sepolia Testnet

---

## **Repository Structure**

```text
Auctra/
├── contracts/
│   └── Auction.sol
├── test/
│   └── Auction.test.js
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
├── scripts/
│   └── deploy.js
├── reports/
│   ├── gas-report.txt
│   ├── coverage-report.txt
│   └── gas-optimization.txt
├── hardhat.config.js
├── package.json
└── README.md
```

---

## **Smart Contract Overview**

Main Contract: `Auction.sol`

### **Core Functions**

#### `createAuction()`
Creates a new auction with IPFS CID, starting price, and duration.

#### `placeBid()`
Allows users to place valid higher bids.

#### `withdrawBid()`
Allows outbid users to securely withdraw refundable balances.

#### `endAuction()`
Ends auction after deadline and credits seller balance.

#### `getAuction()`
Returns complete auction details.

#### `getPendingReturn()`
Returns refundable balance for a specific user.

---

## **On-chain vs Off-chain Design**

### **Stored On-chain**

- Seller wallet address  
- Highest bidder address  
- Highest bid amount  
- Auction deadline
- Auction Status
- Auction ended status  
- IPFS CID  

### **Stored Off-chain (IPFS)**

- Product image  
- Product description  
- Metadata JSON  

### **Reason**

Blockchain storage is expensive and permanent. Large files are stored on IPFS, and only the CID is stored on-chain.

---

## **Security Measures**

- OpenZeppelin `ReentrancyGuard`
- `nonReentrant` modifier
- Checks-Effects-Interactions pattern
- Seller cannot self-bid
- Double withdrawal prevention
- Double auction ending prevention

---

## **Gas Optimisation**

We optimized storage variables to reduce gas costs.

### **Before**

Used default `uint256` for all numeric variables.


### **After**

```solidity
uint96 highestBid;
uint96 startingPrice;
uint64 deadline;
```

### **Example Gas Report**

| Function | Before | After |
|----------|--------|-------|
| createAuction() | 142102 | 116609 |
| placeBid() | 76472 | 58107 |

### **Why It Improved**

Smaller datatypes allow efficient storage slot packing, reducing gas consumption.

---
## **Testing**

Comprehensive Hardhat automated test suite implemented for contract functionality, validation checks, edge cases, and security scenarios.

### **Total Test Cases:** 21

### Test Cases Covered

1. Should create auction  
2. Should return auction ID  
3. Should reject empty IPFS hash  
4. Should reject zero starting price  
5. Should reject zero duration  

#### Bidding Logic
6. Should accept valid bid  
7. Should reject seller bidding on own auction  
8. Should reject bids lower than current highest  
9. Should reject equal bids  
10. Should reject bids for invalid auction  
11. Should reject first bid below starting price  
12. Should move previous highest bid to pendingReturns  

#### Withdrawals
13. Should allow withdrawal of pending returns  
14. Should reject withdrawal when no funds available  
15. Should not allow double withdrawal  

#### Auction Ending
16. Should end auction after deadline  
17. Should revert endAuction before deadline  
18. Should not allow ending auction twice  
19. Seller receives highest bid after auction ends  
20. Should reject bids after auction ends  

#### Multiple Auctions
21. Should support multiple auctions simultaneously  

#### Security
22. Should prevent reentrancy attack  

---

## **Setup Instructions**

### **Prerequisites**

Install the following:

- Node.js  
- npm  
- Git  
- MetaMask Browser Extension  

---

### **Install Dependencies**

```bash
npm install
```

### **Compile Smart Contracts**

```bash
npx hardhat compile
```

### **Run Tests**

```bash
npx hardhat test
```

### **Generate Coverage Report**

```bash
npx hardhat coverage
```

### **Generate Gas Report**

```bash
REPORT_GAS=true npx hardhat test
```

### **Deploy to Sepolia Testnet**

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### **Run Frontend**

```bash
cd frontend
npm install
npm start
```

---

## **Live Demo Flow**

1. Connect MetaMask wallet  
2. Upload image to IPFS  
3. Create auction  
4. Place bid using second wallet  
5. Withdraw previous bid  
6. End auction after deadline  
7. Display winner and balances  

---

## **Future Enhancements**

- NFT-based auctions  
- Mobile application  
- Multi-chain support  
- Real-time notifications  
- Reputation system  
- Auto-bidding system  

---
