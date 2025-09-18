import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useBlockchain } from '../contexts/BlockchainContext';

interface Transaction {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  gasUsed?: string;
  timestamp: number;
  description?: string;
}

interface TransactionMonitorProps {
  transactions: Transaction[];
  onTransactionUpdate: (hash: string, status: Transaction['status'], details?: any) => void;
}

const TransactionMonitor: React.FC<TransactionMonitorProps> = ({
  transactions,
  onTransactionUpdate
}) => {
  const { provider } = useBlockchain();
  const [localTransactions, setLocalTransactions] = useState<Transaction[]>(transactions);

  useEffect(() => {
    setLocalTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    if (!provider) return;

    const checkTransactionStatuses = async () => {
      for (const tx of localTransactions) {
        if (tx.status === 'pending') {
          try {
            const receipt = await provider.getTransactionReceipt(tx.hash);
            if (receipt) {
              const status = receipt.status === 1 ? 'confirmed' : 'failed';
              const updatedTx = {
                ...tx,
                status,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
              };
              setLocalTransactions(prev =>
                prev.map(t => t.hash === tx.hash ? updatedTx : t)
              );
              onTransactionUpdate(tx.hash, status, updatedTx);
            }
          } catch (error) {
            console.error('Error checking transaction status:', error);
          }
        }
      }
    };

    const interval = setInterval(checkTransactionStatuses, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, [provider, localTransactions, onTransactionUpdate]);

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'confirmed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatAddress = (hash: string) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  if (localTransactions.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Transaction History</h3>
        <p className="text-gray-500">No transactions yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Transaction History</h3>
      <div className="space-y-2">
        {localTransactions.map((tx) => (
          <div key={tx.hash} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>
                  {tx.status.toUpperCase()}
                </span>
                {tx.description && (
                  <span className="text-sm text-gray-600">{tx.description}</span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {formatAddress(tx.hash)}
              </p>
              <p className="text-xs text-gray-400">
                {formatTime(tx.timestamp)}
                {tx.blockNumber && ` • Block ${tx.blockNumber}`}
                {tx.gasUsed && ` • Gas used: ${tx.gasUsed}`}
              </p>
            </div>
            <a
              href={`https://polygonscan.com/tx/${tx.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700 text-sm"
            >
              View on Explorer
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionMonitor;