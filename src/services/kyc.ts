import pool from '../db/index';
import { KYCResult } from '../types/kyc';

export class KYCService {
  private notabeneApiKey: string;
  private notabeneBaseUrl: string;

  constructor() {
    this.notabeneApiKey = process.env.NOTABENE_API_KEY || '';
    this.notabeneBaseUrl = process.env.NOTABENE_BASE_URL || 'https://api.notabene.id';
  }

  async verifyKYC(userId: string, userData: any): Promise<KYCResult> {
    try {
      // Call Notabene API
      const response = await fetch(`${this.notabeneBaseUrl}/api/v1/kyc/verification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.notabeneApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          ...userData,
        }),
      });

      if (!response.ok) {
        throw new Error(`Notabene API error: ${response.status} ${response.statusText}`);
      }

      const apiResult = await response.json();

      // Process result
      const kycResult: KYCResult = {
        status: apiResult.status === 'approved' ? 'approved' : 'rejected',
        reason: apiResult.reason || 'KYC verification completed',
        timestamp: new Date(),
      };

      // Save to database
      await this.saveKYCResult(userId, kycResult);

      // Log the decision
      console.log(`KYC Decision for user ${userId}: ${kycResult.status} - ${kycResult.reason}`);

      return kycResult;
    } catch (error) {
      console.error('KYC verification failed:', error);
      const errorResult: KYCResult = {
        status: 'rejected',
        reason: `KYC verification failed: ${(error as Error).message}`,
        timestamp: new Date(),
      };

      // Save error result to database
      await this.saveKYCResult(userId, errorResult);

      return errorResult;
    }
  }

  private async saveKYCResult(userId: string, result: KYCResult): Promise<void> {
    try {
      const query = `
        INSERT INTO kyc_results (user_id, status, reason, created_at)
        VALUES ($1, $2, $3, $4)
      `;
      const values = [userId, result.status, result.reason, result.timestamp];

      await pool.query(query, values);
    } catch (error) {
      console.error('Failed to save KYC result to database:', error);
      throw error;
    }
  }

  async getLatestKYCResult(userId: string): Promise<KYCResult | null> {
    try {
      const query = `
        SELECT status, reason, created_at as timestamp
        FROM kyc_results
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const result = await pool.query(query, [userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        status: row.status,
        reason: row.reason,
        timestamp: row.timestamp,
      };
    } catch (error) {
      console.error('Failed to get KYC result from database:', error);
      throw error;
    }
  }
}