import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { ContractService } from '../services/contracts';

interface Transaction {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  gasUsed?: string;
  timestamp: number;
  description?: string;
}

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const addTransaction = useCallback((hash: string, description?: string) => {
    const newTransaction: Transaction = {
      hash,
      status: 'pending',
      timestamp: Date.now(),
      description,
    };

    setTransactions(prev => [newTransaction, ...prev]);
  }, []);

  const updateTransaction = useCallback((hash: string, status: Transaction['status'], details?: any) => {
    setTransactions(prev =>
      prev.map(tx =>
        tx.hash === hash
          ? {
              ...tx,
              status,
              blockNumber: details?.blockNumber,
              gasUsed: details?.gasUsed,
            }
          : tx
      )
    );
  }, []);

  const clearTransactions = useCallback(() => {
    setTransactions([]);
  }, []);

  const executeTransaction = useCallback(async (
    contractService: ContractService,
    method: () => Promise<ethers.TransactionResponse>,
    description?: string
  ): Promise<ethers.TransactionResponse> => {
    try {
      const tx = await method();
      addTransaction(tx.hash, description);
      return tx;
    } catch (error) {
      console.error('Transaction execution failed:', error);
      throw error;
    }
  }, [addTransaction]);

  return {
    transactions,
    addTransaction,
    updateTransaction,
    clearTransactions,
    executeTransaction,
  };
};