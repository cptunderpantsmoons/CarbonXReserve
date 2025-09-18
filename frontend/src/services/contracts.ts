import { ethers } from 'ethers';
import cACCUABI from '../abi/caccu.json';
import CXRTABI from '../abi/cxrt.json';

const CACCU_CONTRACT_ADDRESS = process.env.REACT_APP_CACCU_CONTRACT_ADDRESS || '0x1234567890123456789012345678901234567890';
const CXRT_CONTRACT_ADDRESS = process.env.REACT_APP_CXRT_CONTRACT_ADDRESS || '0x1234567890123456789012345678901234567890';

export class ContractService {
  private provider: ethers.Provider;
  private signer: ethers.Signer | null;
  private cACCUContract: ethers.Contract;
  private cxrtContract: ethers.Contract;

  constructor(provider: ethers.Provider, signer: ethers.Signer | null = null) {
    this.provider = provider;
    this.signer = signer;

    // Initialize contracts
    const contractRunner = signer || provider;
    this.cACCUContract = new ethers.Contract(CACCU_CONTRACT_ADDRESS, cACCUABI, contractRunner);
    this.cxrtContract = new ethers.Contract(CXRT_CONTRACT_ADDRESS, CXRTABI, contractRunner);
  }

  private async checkKYC(userId: string): Promise<void> {
    const response = await fetch(`/api/kyc/status/${userId}`);
    if (!response.ok) {
      throw new Error('Failed to check KYC status');
    }
    const data = await response.json();
    if (data.kycStatus !== 'approved') {
      throw new Error('KYC approval required');
    }
  }

  // ==================== cACCU (ERC-1155) Functions ====================

  /**
   * Get balance of a specific token ID for an account
   */
  async getCACCUBalance(account: string, tokenId: number): Promise<bigint> {
    try {
      const balance = await this.cACCUContract.balanceOf(account, tokenId);
      return balance;
    } catch (error) {
      console.error('Error getting cACCU balance:', error);
      throw error;
    }
  }

  /**
   * Get balances for multiple token IDs for an account
   */
  async getCACCUBalances(account: string, tokenIds: number[]): Promise<bigint[]> {
    try {
      const balances = await this.cACCUContract.balanceOfBatch([account], tokenIds);
      return balances;
    } catch (error) {
      console.error('Error getting cACCU balances:', error);
      throw error;
    }
  }

  /**
    * Mint cACCU tokens (requires MINTER_ROLE)
    */
   async mintCACCU(userId: string, to: string, tokenId: number, amount: number, data: string = '0x'): Promise<ethers.TransactionResponse> {
     if (!this.signer) throw new Error('Signer required for minting');

     // Check KYC
     await this.checkKYC(userId);

     try {
       const tx = await this.cACCUContract.mint(to, tokenId, amount, data);
       return tx;
     } catch (error) {
       console.error('Error minting cACCU:', error);
       throw error;
     }
   }

  /**
   * Batch mint cACCU tokens
   */
  async mintBatchCACCU(to: string, tokenIds: number[], amounts: number[], data: string = '0x'): Promise<ethers.TransactionResponse> {
    if (!this.signer) throw new Error('Signer required for batch minting');

    try {
      const tx = await this.cACCUContract.mintBatch(to, tokenIds, amounts, data);
      return tx;
    } catch (error) {
      console.error('Error batch minting cACCU:', error);
      throw error;
    }
  }

  /**
   * Burn cACCU tokens
   */
  async burnCACCU(tokenId: number, amount: number): Promise<ethers.TransactionResponse> {
    if (!this.signer) throw new Error('Signer required for burning');

    try {
      const tx = await this.cACCUContract.burn(tokenId, amount);
      return tx;
    } catch (error) {
      console.error('Error burning cACCU:', error);
      throw error;
    }
  }

  /**
    * Transfer cACCU tokens
    */
   async transferCACCU(userId: string, from: string, to: string, tokenId: number, amount: number, data: string = '0x'): Promise<ethers.TransactionResponse> {
     if (!this.signer) throw new Error('Signer required for transfer');

     // Check KYC
     await this.checkKYC(userId);

     try {
       const tx = await this.cACCUContract.safeTransferFrom(from, to, tokenId, amount, data);
       return tx;
     } catch (error) {
       console.error('Error transferring cACCU:', error);
       throw error;
     }
   }

  /**
   * Get total supply of a specific token ID
   */
  async getCACCUTotalSupply(tokenId: number): Promise<bigint> {
    try {
      const supply = await this.cACCUContract.totalSupply(tokenId);
      return supply;
    } catch (error) {
      console.error('Error getting cACCU total supply:', error);
      throw error;
    }
  }

  /**
   * Get URI for a token ID
   */
  async getCACCUURI(tokenId: number): Promise<string> {
    try {
      const uri = await this.cACCUContract.uri(tokenId);
      return uri;
    } catch (error) {
      console.error('Error getting cACCU URI:', error);
      throw error;
    }
  }

  /**
   * Check if account has MINTER_ROLE
   */
  async hasMinterRole(account: string): Promise<boolean> {
    try {
      const role = await this.cACCUContract.MINTER_ROLE();
      const hasRole = await this.cACCUContract.hasRole(role, account);
      return hasRole;
    } catch (error) {
      console.error('Error checking minter role:', error);
      throw error;
    }
  }

  // ==================== CXRT Functions ====================

  /**
   * Get CXRT balance for an account
   */
  async getCXRTBalance(account: string): Promise<bigint> {
    try {
      const balance = await this.cxrtContract.balanceOf(account);
      return balance;
    } catch (error) {
      console.error('Error getting CXRT balance:', error);
      throw error;
    }
  }

  /**
    * Mint CXRT tokens
    */
   async mintCXRT(
     userId: string,
     to: string,
     amount: number,
     projectId: string,
     vintage: number,
     projectType: string,
     location: string
   ): Promise<ethers.TransactionResponse> {
     if (!this.signer) throw new Error('Signer required for minting');

     // Check KYC
     await this.checkKYC(userId);

     try {
       const tx = await this.cxrtContract.mint(to, amount, projectId, vintage, projectType, location);
       return tx;
     } catch (error) {
       console.error('Error minting CXRT:', error);
       throw error;
     }
   }

  // ==================== Utility Functions ====================

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(txHash: string): Promise<ethers.TransactionReceipt> {
    try {
      const receipt = await this.provider.waitForTransaction(txHash);
      return receipt;
    } catch (error) {
      console.error('Error waiting for transaction:', error);
      throw error;
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(txHash: string): Promise<ethers.TransactionResponse | null> {
    try {
      const tx = await this.provider.getTransaction(txHash);
      return tx;
    } catch (error) {
      console.error('Error getting transaction:', error);
      throw error;
    }
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(tx: any): Promise<bigint> {
    try {
      const gasEstimate = await this.provider.estimateGas(tx);
      return gasEstimate;
    } catch (error) {
      console.error('Error estimating gas:', error);
      throw error;
    }
  }
}

// Factory function to create contract service
export const createContractService = (provider: ethers.Provider, signer: ethers.Signer | null = null): ContractService => {
  return new ContractService(provider, signer);
};