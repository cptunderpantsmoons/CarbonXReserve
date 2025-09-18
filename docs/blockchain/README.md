# CarbonXReserve Blockchain Documentation

This documentation covers the blockchain components of the CarbonXReserve platform, a comprehensive carbon token management system designed for AFSL-regulated financial products.

## Overview

CarbonXReserve implements tokenized carbon credits using smart contracts on the Polygon network. The platform features:

- **cACCU Token**: ERC-1155 multi-token contract for carbon credits with vintage support
- **CXRT Token**: Carbon exchange reserve token for platform operations
- **Polygon Integration**: Optimized for low-cost, fast transactions on Polygon mainnet
- **Frontend Integration**: Web3-enabled React application with wallet connectivity
- **Security Features**: Comprehensive security measures for regulated financial products

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- MetaMask or compatible Web3 wallet
- Polygon network RPC access

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd carbonxreserve
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd frontend && npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Compile contracts**
   ```bash
   npx hardhat compile
   ```

5. **Run tests**
   ```bash
   npm test
   ```

6. **Start development server**
   ```bash
   cd frontend && npm start
   ```

### Environment Variables

```env
# Polygon RPC URLs
POLYGON_MAINNET_RPC_URL=https://polygon-rpc.com/
POLYGON_MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com/

# Wallet configuration
PRIVATE_KEY=your-private-key-here
WALLET_CONNECT_PROJECT_ID=your-walletconnect-project-id

# Contract addresses
REACT_APP_CACCU_CONTRACT_ADDRESS=0x...
REACT_APP_CXRT_CONTRACT_ADDRESS=0x...

# Contract deployment
CONTRACT_BASE_URI=https://api.carbonxreserve.com/metadata/{id}
ADDITIONAL_MINTERS=0x...,0x...
ADDITIONAL_BURNERS=0x...,0x...
```

## Documentation Structure

- **[Architecture](architecture.md)**: Detailed smart contract architecture and tokenomics
- **[Deployment](deployment.md)**: Polygon network deployment procedures and configuration
- **[Integration](integration.md)**: Frontend blockchain integration guide and API references
- **[Security](security.md)**: AFSL compliance and security considerations

## Key Features

### Token Management
- ERC-1155 standard for multi-vintage carbon credits
- Role-based access control (minter/burner roles)
- Emergency pause functionality
- Supply tracking and verification

### Network Integration
- Polygon mainnet and Mumbai testnet support
- Gas-optimized transactions
- Web3Modal integration for wallet connectivity
- Real-time transaction monitoring

### Compliance & Security
- AFSL-regulated financial product design
- Comprehensive audit trail
- Reentrancy protection
- Access control and ownership management

## Support

For technical support or questions about the blockchain implementation, please refer to the detailed documentation or contact the development team.

## License

This project is licensed under the MIT License - see the LICENSE file for details.