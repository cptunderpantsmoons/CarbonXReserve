# Smart Contract Architecture

This document provides a comprehensive overview of the CarbonXReserve smart contract architecture, focusing on the tokenized carbon credit system implemented on the Polygon network.

## Overview

CarbonXReserve implements a dual-token system designed for carbon credit tokenization and trading:

- **cACCU (Carbon eXchange Reserve Units)**: ERC-1155 multi-token contract for carbon credits
- **CXRT (Carbon eXchange Reserve Token)**: Platform utility token for operations and incentives

## cACCU Token Contract

### Contract Details

- **Standard**: ERC-1155 Multi Token Standard
- **Solidity Version**: ^0.8.20
- **Libraries**: OpenZeppelin Contracts v4.x
- **Network**: Polygon (Mainnet & Mumbai Testnet)

### Key Features

#### Multi-Vintage Support
The ERC-1155 standard enables support for multiple carbon credit vintages through token IDs:

```solidity
// Each token ID represents a different vintage/year
uint256 vintage2023 = 2023;
uint256 vintage2024 = 2024;

// Mint credits for different vintages
contract.mint(user, vintage2023, 100, "0x");
contract.mint(user, vintage2024, 150, "0x");
```

#### Role-Based Access Control
Implements granular permissions using OpenZeppelin's AccessControl:

- **MINTER_ROLE**: Authorized to mint new tokens
- **BURNER_ROLE**: Authorized to burn tokens
- **DEFAULT_ADMIN_ROLE**: Contract administration

#### Security Features
- **Pausable**: Emergency stop functionality
- **ReentrancyGuard**: Protection against reentrant attacks
- **Ownable**: Single owner for critical functions

### Contract Structure

#### State Variables
```solidity
bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
uint256 public constant MAX_SUPPLY = 2**256 - 1;
string public constant VERSION = "1.0.0";
mapping(uint256 => uint256) private _totalSupply;
```

#### Core Functions

##### Minting Functions
```solidity
function mint(address to, uint256 id, uint256 amount, bytes memory data)
    external onlyMinter whenNotPaused nonReentrant

function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data)
    external onlyMinter whenNotPaused nonReentrant
```

##### Burning Functions
```solidity
function burn(uint256 id, uint256 amount)
    external whenNotPaused nonReentrant

function burnFrom(address from, uint256 id, uint256 amount)
    external onlyBurner whenNotPaused nonReentrant

function burnBatch(uint256[] memory ids, uint256[] memory amounts)
    external whenNotPaused nonReentrant
```

##### Administrative Functions
```solidity
function pause() external onlyOwner
function unpause() external onlyOwner
function addMinter(address minter) external onlyOwner
function removeMinter(address minter) external onlyOwner
function setURI(string memory newBaseURI) external onlyOwner
```

### Supply Tracking

The contract maintains total supply tracking for each token ID:

```solidity
function totalSupply(uint256 id) public view returns (uint256) {
    return _totalSupply[id];
}
```

Total supply is updated in the `_update` function to track minting and burning operations.

## CXRT Token Contract

### Overview
The CXRT token is designed for platform operations and may include additional features for project registration and verification.

### Key Features
- **Custom Mint Function**: Includes project metadata
- **Project Tracking**: Stores project details on-chain
- **Balance Queries**: Standard ERC-20 balance functionality

### Mint Function
```solidity
function mint(
    address to,
    uint256 amount,
    string memory projectId,
    uint256 vintage,
    string memory projectType,
    string memory location
) external
```

## Tokenomics Design

### cACCU Tokenomics

#### Supply Mechanics
- **Unlimited Supply**: Each vintage can have up to 2^256 - 1 tokens
- **Vintage Isolation**: Each vintage/year operates independently
- **Burn Mechanism**: Credits can be retired/burned for compliance

#### Use Cases
- **Trading**: Transfer credits between accounts
- **Retirement**: Burn credits for carbon offset claims
- **Staking**: Lock credits for governance participation
- **Compliance**: Regulatory reporting and verification

### Economic Model

#### Value Proposition
- **Transparency**: On-chain verification of carbon credits
- **Liquidity**: Trading on DEXs and NFT marketplaces
- **Compliance**: Regulatory compliance for AFSL requirements
- **Scalability**: Low-cost transactions on Polygon

#### Revenue Streams
- **Transaction Fees**: Platform fees on trades
- **Minting Fees**: Project registration and verification
- **Service Fees**: API access and advanced features

## Security Architecture

### Access Control
```
Owner (AFSL Entity)
├── Admin Role
│   ├── Add/Remove Minters
│   ├── Add/Remove Burners
│   ├── Pause/Unpause Contract
│   └── Update Metadata URI
├── Minter Role
│   └── Mint Tokens
└── Burner Role
    └── Burn Tokens
```

### Emergency Procedures
- **Circuit Breaker**: Contract can be paused in emergencies
- **Role Revocation**: Compromised accounts can be removed
- **Upgrade Path**: Version tracking for contract upgrades

### Audit Trail
All operations emit events for complete transparency:
- `TokensMinted`
- `TokensBurned`
- `MinterAdded/Removed`
- `BurnerAdded/Removed`
- `Paused/Unpaused`

## Integration Points

### Frontend Integration
The contract integrates with the React frontend through:
- **Web3Modal**: Wallet connectivity
- **Ethers.js**: Contract interaction
- **Real-time Updates**: Transaction monitoring

### Backend Integration
- **API Services**: Contract interaction APIs
- **Database Sync**: Off-chain data synchronization
- **Event Processing**: Transaction event handling

### External Systems
- **Oracle Integration**: Price feeds and external data
- **KYC Systems**: User verification integration
- **Regulatory Reporting**: Compliance data export

## Development and Testing

### Testing Strategy
- **Unit Tests**: Individual function testing
- **Integration Tests**: Cross-contract interactions
- **Security Tests**: Reentrancy and access control
- **Gas Optimization**: Transaction cost analysis

### Code Quality
- **OpenZeppelin Standards**: Battle-tested implementations
- **NatSpec Documentation**: Comprehensive function documentation
- **Test Coverage**: >90% code coverage requirement

## Future Enhancements

### Planned Features
- **Batch Operations**: Multi-vintage transactions
- **Governance**: DAO-based governance system
- **Cross-chain**: Bridge support for other networks
- **Advanced Analytics**: On-chain analytics and reporting

### Upgrade Mechanism
- **Proxy Pattern**: Upgradeable contract architecture
- **Version Control**: Backward compatibility management
- **Migration Scripts**: Seamless upgrade procedures

This architecture provides a robust foundation for tokenized carbon credits while maintaining security, compliance, and scalability requirements for AFSL-regulated financial products.