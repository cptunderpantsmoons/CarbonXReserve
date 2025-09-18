# Polygon Network Deployment Guide

This guide covers the deployment procedures for CarbonXReserve smart contracts on the Polygon network, including both mainnet and testnet environments.

## Prerequisites

### System Requirements
- Node.js 18.x or higher
- npm or yarn package manager
- Git for version control

### Network Requirements
- Polygon Mumbai Testnet RPC access
- Polygon Mainnet RPC access (for production)
- Sufficient MATIC for gas fees
- Private key or hardware wallet

### Dependencies
```json
{
  "@nomicfoundation/hardhat-toolbox": "^4.0.0",
  "ethers": "^6.15.0"
}
```

## Environment Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd carbonxreserve
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:

```env
# Polygon Network RPC URLs
POLYGON_MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com/
POLYGON_MAINNET_RPC_URL=https://polygon-rpc.com/

# Private Key (NEVER commit to version control)
PRIVATE_KEY=your-private-key-without-0x-prefix

# WalletConnect Project ID
WALLET_CONNECT_PROJECT_ID=your-walletconnect-project-id

# Contract Configuration
CONTRACT_BASE_URI=https://api.carbonxreserve.com/metadata/{id}
ADDITIONAL_MINTERS=0x1234...,0x5678...
ADDITIONAL_BURNERS=0x9abc...,0xdef0...
```

### 3. Hardhat Configuration
The `hardhat.config.js` is pre-configured for Polygon networks:

```javascript
module.exports = {
  solidity: "0.8.20",
  networks: {
    mumbai: {
      url: process.env.POLYGON_MUMBAI_RPC_URL,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80001,
      gasPrice: "auto",
      gasLimit: 3000000,
      blockConfirmations: 2,
    },
    polygon: {
      url: process.env.POLYGON_MAINNET_RPC_URL,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 137,
      gasPrice: "auto",
      gasLimit: 3000000,
      blockConfirmations: 6,
    },
  },
};
```

## Deployment Process

### Step 1: Compile Contracts
```bash
npx hardhat compile
```

This generates:
- Contract artifacts in `artifacts/` directory
- TypeChain types for TypeScript integration
- Contract bytecode and ABI files

### Step 2: Run Tests (Recommended)
```bash
npm test
```

Ensure all tests pass before deployment:
```bash
npx hardhat test
```

### Step 3: Deploy to Testnet (Mumbai)

#### Option A: Using Hardhat Tasks
```bash
npx hardhat run scripts/deploy-caccu.js --network mumbai
```

#### Option B: Using Custom Script
```bash
node scripts/deploy-caccu.js
```

With environment variables:
```bash
RPC_URL=https://rpc-mumbai.maticvigil.com/ \
PRIVATE_KEY=your-private-key \
CONTRACT_BASE_URI=https://api.carbonxreserve.com/metadata/{id} \
node scripts/deploy-caccu.js
```

### Step 4: Verify Deployment
After successful deployment, verify the contract on PolygonScan:

#### Mumbai Testnet
```bash
npx hardhat verify --network mumbai <CONTRACT_ADDRESS> "<BASE_URI>"
```

#### Mainnet
```bash
npx hardhat verify --network polygon <CONTRACT_ADDRESS> "<BASE_URI>"
```

## Post-Deployment Configuration

### 1. Role Assignment
After deployment, configure additional roles:

```javascript
// Add minters
await contract.addMinter(minterAddress1);
await contract.addMinter(minterAddress2);

// Add burners
await contract.addBurner(burnerAddress1);
await contract.addBurner(burnerAddress2);
```

### 2. Initial Minting (Optional)
Perform initial token minting for testing:

```javascript
// Mint test tokens for different vintages
await contract.mint(userAddress, 2023, 1000, "0x");
await contract.mint(userAddress, 2024, 1500, "0x");
```

### 3. Metadata Setup
Ensure metadata API is configured and accessible:

```javascript
// Example metadata structure
{
  "name": "Carbon Credit 2023",
  "description": "Verified carbon credit for 2023 vintage",
  "image": "https://api.carbonxreserve.com/images/2023.png",
  "attributes": [
    {
      "trait_type": "Vintage",
      "value": "2023"
    },
    {
      "trait_type": "Project Type",
      "value": "Forestry"
    }
  ]
}
```

## Production Deployment

### Mainnet Deployment Checklist
- [ ] All tests pass on testnet
- [ ] Contract verified on testnet
- [ ] Security audit completed
- [ ] Gas optimization verified
- [ ] Emergency procedures documented
- [ ] Backup deployment keys secured
- [ ] Monitoring systems configured

### Mainnet Deployment Steps
```bash
# Deploy to mainnet
npx hardhat run scripts/deploy-caccu.js --network polygon

# Verify contract
npx hardhat verify --network polygon <CONTRACT_ADDRESS> "<BASE_URI>"

# Update frontend configuration
echo "REACT_APP_CACCU_CONTRACT_ADDRESS=<CONTRACT_ADDRESS>" >> frontend/.env.production
```

## Troubleshooting

### Common Issues

#### 1. Insufficient Gas
```
Error: Transaction ran out of gas
```
**Solution**: Increase gas limit in hardhat.config.js or use gas estimation.

#### 2. Invalid Private Key
```
Error: invalid hex string
```
**Solution**: Ensure private key doesn't include "0x" prefix.

#### 3. Network Connection Issues
```
Error: could not detect network
```
**Solution**: Verify RPC URL and network connectivity.

#### 4. Contract Verification Failure
```
Error: The contract verification failed
```
**Solution**:
- Ensure exact constructor parameters
- Check compiler version matches
- Verify contract source code

### Gas Optimization Tips
- Use `gasPrice: "auto"` for dynamic pricing
- Set appropriate `gasLimit` based on function complexity
- Deploy during low network congestion
- Consider contract size for deployment costs

## Deployment Scripts

### Custom Deployment Script (`scripts/deploy-caccu.js`)
The deployment script includes:
- Contract compilation verification
- Network connectivity checks
- Gas estimation
- Post-deployment configuration
- Deployment logging and artifact saving

### Automated Deployment
For CI/CD pipelines:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Polygon
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx hardhat compile
      - run: npm test
      - run: npx hardhat run scripts/deploy-caccu.js --network polygon
        env:
          PRIVATE_KEY: ${{ secrets.PRIVATE_KEY }}
          POLYGON_MAINNET_RPC_URL: ${{ secrets.POLYGON_RPC_URL }}
```

## Monitoring and Maintenance

### Post-Deployment Monitoring
- Contract address tracking
- Transaction monitoring
- Balance verification
- Event logging

### Upgrade Procedures
- Version tracking
- Migration scripts
- Backward compatibility testing
- Emergency pause procedures

## Security Considerations

### Key Management
- Use hardware wallets for mainnet deployment
- Implement multi-signature for critical operations
- Regular key rotation procedures

### Network Security
- Monitor for reorg events
- Implement retry mechanisms
- Backup deployment artifacts

### Emergency Procedures
- Contract pause functionality
- Role revocation procedures
- Incident response plan

This deployment guide ensures consistent, secure, and reliable contract deployment across Polygon networks while maintaining compliance with AFSL requirements.