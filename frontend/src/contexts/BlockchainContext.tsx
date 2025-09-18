import React, { createContext, useContext, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react';

// Web3Modal configuration
const projectId = process.env.REACT_APP_WALLET_CONNECT_PROJECT_ID || 'default-project-id'; // Replace with your WalletConnect project ID

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
    chainId: 80001, // Polygon Mumbai Testnet
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

const BlockchainContext = createContext<BlockchainContextType | undefined>(undefined);

export const useBlockchain = () => {
  const context = useContext(BlockchainContext);
  if (context === undefined) {
    throw new Error('useBlockchain must be used within a BlockchainProvider');
  }
  return context;
};

export const BlockchainProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [provider, setProvider] = useState<ethers.Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Initialize provider on mount
  useEffect(() => {
    const initProvider = async () => {
      if (window.ethereum) {
        try {
          const ethersProvider = new ethers.BrowserProvider(window.ethereum);
          setProvider(ethersProvider);

          // Check if already connected
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            const ethersSigner = await ethersProvider.getSigner();
            setSigner(ethersSigner);
            setAddress(accounts[0]);
            setIsConnected(true);
          }
        } catch (error) {
          console.error('Error initializing provider:', error);
        }
      }
    };

    initProvider();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length === 0) {
          // Disconnected
          setAddress(null);
          setSigner(null);
          setIsConnected(false);
        } else {
          // Account changed
          setAddress(accounts[0]);
          if (provider) {
            const ethersSigner = await provider.getSigner();
            setSigner(ethersSigner);
            setIsConnected(true);
          }
        }
      };

      const handleChainChanged = async () => {
        // Reload the page to avoid issues with chain changes
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [provider]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask or another Web3 wallet');
      return;
    }

    setIsConnecting(true);
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      if (provider) {
        const ethersSigner = await provider.getSigner();
        const userAddress = await ethersSigner.getAddress();
        setSigner(ethersSigner);
        setAddress(userAddress);
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      setAddress(null);
      setSigner(null);
      setIsConnected(false);
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  const switchNetwork = async (chainId: number) => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      // If network doesn't exist, add it
      if (switchError.code === 4902) {
        const chain = chains.find(c => c.chainId === chainId);
        if (chain) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: `0x${chainId.toString(16)}`,
                  chainName: chain.name,
                  nativeCurrency: {
                    name: chain.currency,
                    symbol: chain.currency,
                    decimals: 18,
                  },
                  rpcUrls: [chain.rpcUrl],
                  blockExplorerUrls: [chain.explorerUrl],
                },
              ],
            });
          } catch (addError) {
            console.error('Error adding network:', addError);
          }
        }
      }
    }
  };

  const value: BlockchainContextType = {
    provider,
    signer,
    address,
    isConnected,
    isConnecting,
    connectWallet,
    disconnectWallet,
    switchNetwork,
  };

  return (
    <BlockchainContext.Provider value={value}>
      {children}
    </BlockchainContext.Provider>
  );
};

// Type declaration for window.ethereum
declare global {
  interface Window {
    ethereum: any;
  }
}