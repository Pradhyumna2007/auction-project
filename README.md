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
| createAuction() | _(Add Value)_ | _(Add Value)_ |
| placeBid() | _(Add Value)_ | _(Add Value)_ |

### **Why It Improved**

Smaller datatypes allow efficient storage slot packing, reducing gas consumption.

---
## **Testing**

Comprehensive Hardhat automated test suite implemented for contract functionality, validation checks, edge cases, and security scenarios.

### **Total Test Cases:** 21

### **Implemented Test Cases**

1. Create auction successfully  
2. Return correct auction details  
3. Reject empty item name  
4. Reject empty IPFS CID  
5. Reject zero starting price  
6. Reject zero duration  
7. Accept valid bid  
8. Reject seller self-bid  
9. Reject lower bid  
10. Reject equal bid  
11. Reject invalid auction ID  
12. Move previous highest bid to pendingReturns  
13. Allow withdraw refund  
14. Reject withdraw when no funds exist  
15. End auction after deadline  
16. Reject bids after auction ended  
17. Support multiple auctions  
18. Reject ending before deadline  
19. Credit seller after successful ending  
20. Prevent reentrancy attack  
21. Prevent ending auction twice  
22. Prevent double withdrawal

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
