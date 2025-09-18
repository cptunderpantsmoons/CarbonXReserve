# Frontend Blockchain Integration Guide

This guide covers the integration of CarbonXReserve smart contracts with the React frontend application, including wallet connectivity, contract interactions, and real-time transaction monitoring.

## Architecture Overview

The frontend integration consists of three main layers:

1. **Blockchain Context**: Web3 connectivity and wallet management
2. **Contract Services**: Smart contract interaction abstraction
3. **React Components**: User interface components

## Blockchain Context Setup

### Web3Modal Configuration

The application uses Web3Modal for wallet connectivity with Polygon network support:

```typescript
// frontend/src/contexts/BlockchainContext.tsx
import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react';

const projectId = process.env.REACT_APP_WALLET_CONNECT_PROJECT_ID;
const metadata = {
  name: 'CarbonXReserve',
  description: 'AFSL-regulated carbon token management platform',
  url: 'https://carbonxreserve.com',
  icons: ['https://walletconnect.com/walletconnect-logo.png']
};

const chains = [
  {
    chainId: 137, // Polygon Mainnet
    name: 'Polygon',
    currency: 'MATIC',
    explorerUrl: 'https://polygonscan.com',
    rpcUrl: 'https://polygon-rpc.com'
  },
  {
    chainId: 80001, // Polygon Mumbai
    name: 'Polygon Mumbai',
    currency: 'MATIC',
    explorerUrl: 'https://mumbai.polygonscan.com',
    rpcUrl: 'https://rpc-mumbai.maticvigil.com'
  }
];

const ethersConfig = defaultConfig({
  metadata,
  defaultChainId: 137,
  enableEIP6963: true,
  enableInjected: true,
  enableCoinbase: true,
  rpcUrl: 'https://polygon-rpc.com',
});

createWeb3Modal({
  ethersConfig,
  chains,
  projectId,
  enableAnalytics: false
});
```

### Context Provider

The `BlockchainProvider` manages Web3 state and provides connection functionality:

```typescript
interface BlockchainContextType {
  provider: ethers.Provider | null;
  signer: ethers.Signer | null;
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  switchNetwork: (chainId: number) => Promise<void>;
}
```

## Contract Service Layer

### Service Architecture

The `ContractService` class abstracts all smart contract interactions:

```typescript
// frontend/src/services/contracts.ts
export class ContractService {
  private provider: ethers.Provider;
  private signer: ethers.Signer | null;
  private cACCUContract: ethers.Contract;
  private cxrtContract: ethers.Contract;

  constructor(provider: ethers.Provider, signer: ethers.Signer | null = null) {
    this.provider = provider;
    this.signer = signer;

    const contractRunner = signer || provider;
    this.cACCUContract = new ethers.Contract(CACCU_CONTRACT_ADDRESS, cACCUABI, contractRunner);
    this.cxrtContract = new ethers.Contract(CXRT_CONTRACT_ADDRESS, CXRTABI, contractRunner);
  }
}
```

### cACCU Contract Methods

#### Balance Operations
```typescript
/**
 * Get balance for specific token ID
 */
async getCACCUBalance(account: string, tokenId: number): Promise<bigint> {
  const balance = await this.cACCUContract.balanceOf(account, tokenId);
  return balance;
}

/**
 * Get balances for multiple token IDs
 */
async getCACCUBalances(account: string, tokenIds: number[]): Promise<bigint[]> {
  const balances = await this.cACCUContract.balanceOfBatch([account], tokenIds);
  return balances;
}
```

#### Minting Operations
```typescript
/**
 * Mint cACCU tokens (requires MINTER_ROLE)
 */
async mintCACCU(to: string, tokenId: number, amount: number, data: string = '0x'): Promise<ethers.TransactionResponse> {
  if (!this.signer) throw new Error('Signer required for minting');

  const tx = await this.cACCUContract.mint(to, tokenId, amount, data);
  return tx;
}

/**
 * Batch mint multiple vintages
 */
async mintBatchCACCU(to: string, tokenIds: number[], amounts: number[], data: string = '0x'): Promise<ethers.TransactionResponse> {
  if (!this.signer) throw new Error('Signer required for batch minting');

  const tx = await this.cACCUContract.mintBatch(to, tokenIds, amounts, data);
  return tx;
}
```

#### Transfer Operations
```typescript
/**
 * Transfer cACCU tokens
 */
async transferCACCU(from: string, to: string, tokenId: number, amount: number, data: string = '0x'): Promise<ethers.TransactionResponse> {
  if (!this.signer) throw new Error('Signer required for transfer');

  const tx = await this.cACCUContract.safeTransferFrom(from, to, tokenId, amount, data);
  return tx;
}
```

#### Burning Operations
```typescript
/**
 * Burn cACCU tokens
 */
async burnCACCU(tokenId: number, amount: number): Promise<ethers.TransactionResponse> {
  if (!this.signer) throw new Error('Signer required for burning');

  const tx = await this.cACCUContract.burn(tokenId, amount);
  return tx;
}
```

#### Administrative Operations
```typescript
/**
 * Check MINTER_ROLE status
 */
async hasMinterRole(account: string): Promise<boolean> {
  const role = await this.cACCUContract.MINTER_ROLE();
  const hasRole = await this.cACCUContract.hasRole(role, account);
  return hasRole;
}

/**
 * Get total supply for token ID
 */
async getCACCUTotalSupply(tokenId: number): Promise<bigint> {
  const supply = await this.cACCUContract.totalSupply(tokenId);
  return supply;
}
```

### CXRT Contract Methods

```typescript
/**
 * Get CXRT balance
 */
async getCXRTBalance(account: string): Promise<bigint> {
  const balance = await this.cxrtContract.balanceOf(account);
  return balance;
}

/**
 * Mint CXRT tokens with project metadata
 */
async mintCXRT(
  to: string,
  amount: number,
  projectId: string,
  vintage: number,
  projectType: string,
  location: string
): Promise<ethers.TransactionResponse> {
  if (!this.signer) throw new Error('Signer required for minting');

  const tx = await this.cxrtContract.mint(to, amount, projectId, vintage, projectType, location);
  return tx;
}
```

## React Component Integration

### Wallet Connection Component

```typescript
// frontend/src/components/WalletConnect.tsx
import React from 'react';
import { useBlockchain } from '../contexts/BlockchainContext';

export const WalletConnect: React.FC = () => {
  const { address, isConnected, isConnecting, connectWallet, disconnectWallet } = useBlockchain();

  if (isConnected && address) {
    return (
      <div className="wallet-status">
        <span>Connected: {address.slice(0, 6)}...{address.slice(-4)}</span>
        <button onClick={disconnectWallet}>Disconnect</button>
      </div>
    );
  }

  return (
    <button
      onClick={connectWallet}
      disabled={isConnecting}
    >
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
};
```

### Transaction Monitor Component

```typescript
// frontend/src/components/TransactionMonitor.tsx
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useBlockchain } from '../contexts/BlockchainContext';
import { ContractService } from '../services/contracts';

export const TransactionMonitor: React.FC<{ txHash: string }> = ({ txHash }) => {
  const { provider } = useBlockchain();
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'failed'>('pending');
  const [confirmations, setConfirmations] = useState(0);

  useEffect(() => {
    if (!provider || !txHash) return;

    const monitorTransaction = async () => {
      try {
        const receipt = await provider.waitForTransaction(txHash);
        setStatus(receipt.status === 1 ? 'confirmed' : 'failed');
        setConfirmations(receipt.confirmations);
      } catch (error) {
        setStatus('failed');
      }
    };

    monitorTransaction();
  }, [provider, txHash]);

  return (
    <div className="transaction-status">
      <p>Transaction: {txHash.slice(0, 10)}...</p>
      <p>Status: {status}</p>
      {status === 'confirmed' && <p>Confirmations: {confirmations}</p>}
    </div>
  );
};
```

### Token Balance Display

```typescript
// Example component for displaying balances
import React, { useState, useEffect } from 'react';
import { useBlockchain } from '../contexts/BlockchainContext';
import { ContractService } from '../services/contracts';

export const TokenBalances: React.FC = () => {
  const { provider, signer, address } = useBlockchain();
  const [balances, setBalances] = useState<{[key: number]: bigint}>({});

  useEffect(() => {
    const loadBalances = async () => {
      if (!provider || !address) return;

      const contractService = new ContractService(provider, signer);

      // Load balances for multiple vintages
      const vintages = [2023, 2024, 2025];
      const balancesArray = await contractService.getCACCUBalances(address, vintages);

      const balanceMap = vintages.reduce((acc, vintage, index) => {
        acc[vintage] = balancesArray[index];
        return acc;
      }, {} as {[key: number]: bigint});

      setBalances(balanceMap);
    };

    loadBalances();
  }, [provider, signer, address]);

  return (
    <div className="token-balances">
      <h3>Your Carbon Credits</h3>
      {Object.entries(balances).map(([vintage, balance]) => (
        <div key={vintage}>
          Vintage {vintage}: {ethers.formatUnits(balance, 0)} credits
        </div>
      ))}
    </div>
  );
};
```

## API Reference

### Contract Addresses

```typescript
// Environment variables
const CACCU_CONTRACT_ADDRESS = process.env.REACT_APP_CACCU_CONTRACT_ADDRESS;
const CXRT_CONTRACT_ADDRESS = process.env.REACT_APP_CXRT_CONTRACT_ADDRESS;
```

### Contract ABIs

```typescript
// Import ABIs
import cACCUABI from '../abi/caccu.json';
import CXRTABI from '../abi/cxrt.json';
```

### Error Handling

```typescript
try {
  const tx = await contractService.mintCACCU(address, 2024, 100);
  console.log('Transaction hash:', tx.hash);

  // Wait for confirmation
  const receipt = await tx.wait();
  console.log('Transaction confirmed in block:', receipt.blockNumber);
} catch (error) {
  if (error.code === 'ACTION_REJECTED') {
    console.error('User rejected transaction');
  } else if (error.code === 'INSUFFICIENT_FUNDS') {
    console.error('Insufficient funds for gas');
  } else {
    console.error('Transaction failed:', error.message);
  }
}
```

## Advanced Integration Patterns

### Batch Operations

```typescript
const performBatchMint = async () => {
  const vintages = [2023, 2024];
  const amounts = [100, 150];

  try {
    const tx = await contractService.mintBatchCACCU(address, vintages, amounts);
    await tx.wait();
    console.log('Batch mint successful');
  } catch (error) {
    console.error('Batch mint failed:', error);
  }
};
```

### Event Listening

```typescript
useEffect(() => {
  if (!contractService) return;

  const contract = contractService.cACCUContract;

  // Listen for mint events
  const mintFilter = contract.filters.TokensMinted();
  contract.on(mintFilter, (to, id, amount, event) => {
    console.log('Tokens minted:', { to, id: id.toString(), amount: amount.toString() });
  });

  // Listen for transfer events
  const transferFilter = contract.filters.TransferSingle();
  contract.on(transferFilter, (operator, from, to, id, amount, event) => {
    console.log('Tokens transferred:', { from, to, id: id.toString(), amount: amount.toString() });
  });

  return () => {
    contract.removeAllListeners();
  };
}, [contractService]);
```

### Gas Estimation

```typescript
const estimateMintGas = async () => {
  try {
    const contractService = new ContractService(provider, signer);
    const gasEstimate = await contractService.estimateGas({
      to: CACCU_CONTRACT_ADDRESS,
      data: contractService.cACCUContract.interface.encodeFunctionData('mint', [address, 2024, 100, '0x']),
    });
    console.log('Estimated gas:', gasEstimate.toString());
  } catch (error) {
    console.error('Gas estimation failed:', error);
  }
};
```

## Best Practices

### Performance Optimization
- Use `useMemo` for expensive contract instantiations
- Implement debouncing for frequent balance updates
- Cache contract ABIs and addresses

### Error Handling
- Always check for wallet connection before transactions
- Provide user-friendly error messages
- Implement retry logic for failed transactions

### Security Considerations
- Never store private keys in frontend code
- Validate all user inputs before sending to contracts
- Use checksummed addresses for all operations

### User Experience
- Show loading states during transactions
- Provide transaction hash links to block explorers
- Implement transaction history and status tracking

## Testing Integration

### Unit Testing Components
```typescript
import { render, screen } from '@testing-library/react';
import { BlockchainProvider } from '../contexts/BlockchainContext';

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <BlockchainProvider>
      {component}
    </BlockchainProvider>
  );
};

test('renders wallet connect button when not connected', () => {
  renderWithProvider(<WalletConnect />);
  expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
});
```

### Mocking Contracts for Testing
```typescript
import { ethers } from 'ethers';

const mockContract = {
  balanceOf: jest.fn(),
  mint: jest.fn(),
  // ... other methods
};

jest.mock('ethers', () => ({
  Contract: jest.fn().mockImplementation(() => mockContract),
}));
```

This integration guide provides a comprehensive foundation for frontend blockchain interactions while maintaining security, performance, and user experience standards required for AFSL-regulated financial applications.