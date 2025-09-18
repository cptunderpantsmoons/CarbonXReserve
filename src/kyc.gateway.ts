import { Injectable, Logger } from '@nestjs/common';
import { NotabeneClient } from '@notabene/client';
import { KYCRequest, KYCResult } from './types/kyc';

@Injectable()
export class KycGateway {
  private readonly logger = new Logger(KycGateway.name);
  private client: NotabeneClient;

  constructor() {
    this.client = new NotabeneClient({
      apiKey: process.env.NOTABENE_API_KEY || '',
      baseUrl: process.env.NOTABENE_BASE_URL || 'https://api.notabene.id',
    });
  }

  async verifyKYC(request: KYCRequest): Promise<KYCResult> {
    this.logger.log(`Starting KYC verification for user ${request.userId}`);

    try {
      // Upload documents to Notabene
      const uploadResponse = await this.client.uploadDocuments({
        userId: request.userId,
        fullName: request.fullName,
        documents: [request.idDoc, request.proofOfAddress],
      });

      // Start verification process
      const verificationId = await this.client.startVerification(uploadResponse.verificationId);

      // Poll for result (max 5 minutes = 300 seconds, poll every 10 seconds)
      const maxAttempts = 30;
      let attempts = 0;

      while (attempts < maxAttempts) {
        const statusResponse = await this.client.getVerificationStatus(verificationId);

        if (statusResponse.status !== 'pending') {
          const result: KYCResult = {
            status: statusResponse.status as 'approved' | 'rejected' | 'manual_review',
            reason: statusResponse.reason || 'Verification completed',
            notabeneId: verificationId,
            completedAt: new Date(),
          };

          this.logger.log(`KYC verification completed for user ${request.userId}: ${result.status}`);
          return result;
        }

        await new Promise(resolve => setTimeout(resolve, 10000));
        attempts++;
      }

      throw new Error('KYC verification timeout after 5 minutes');
    } catch (error) {
      this.logger.error(`KYC verification failed for user ${request.userId}`, error);
      throw error;
    }
  }

  async handleWebhook(payload: any): Promise<KYCResult | null> {
    this.logger.log(`Received webhook: ${payload.event}`);

    if (payload.event === 'kyc.completed') {
      const result: KYCResult = {
        status: payload.status as 'approved' | 'rejected' | 'manual_review',
        reason: payload.reason || 'Webhook notification',
        notabeneId: payload.verificationId,
        completedAt: new Date(),
      };

      return result;
    }

    return null;
  }
}