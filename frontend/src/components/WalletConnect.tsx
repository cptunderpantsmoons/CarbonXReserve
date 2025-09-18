import React from 'react';
import { useBlockchain } from '../contexts/BlockchainContext';

const WalletConnect: React.FC = () => {
  const { address, isConnected, isConnecting, connectWallet, disconnectWallet, switchNetwork } = useBlockchain();

  const handleConnect = async () => {
    await connectWallet();
  };

  const handleDisconnect = async () => {
    await disconnectWallet();
  };

  const handleSwitchNetwork = async () => {
    await switchNetwork(137); // Switch to Polygon Mainnet
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (isConnecting) {
    return (
      <div className="bg-blue-500 text-white px-4 py-2 rounded-lg">
        Connecting...
      </div>
    );
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center space-x-4">
        <div className="bg-green-500 text-white px-4 py-2 rounded-lg">
          Connected: {formatAddress(address)}
        </div>
        <button
          onClick={handleSwitchNetwork}
          className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Switch to Polygon
        </button>
        <button
          onClick={handleDisconnect}
          className="bg-red-500 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
    >
      Connect Wallet
    </button>
  );
};

export default WalletConnect;