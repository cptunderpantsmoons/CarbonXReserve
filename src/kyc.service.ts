import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { KycResult } from './kyc.entity';
import { KycGateway } from './kyc.gateway';
import { EmailService } from './services/email';
import { KYCRequest, KYCResult as KYCResultInterface } from './types/kyc';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(KycResult)
    private kycRepository: Repository<KycResult>,
    private kycGateway: KycGateway,
    private emailService: EmailService,
  ) {}

  async verifyKYC(request: KYCRequest): Promise<KYCResultInterface> {
    this.logger.log(`Processing KYC verification for user ${request.userId}`);

    try {
      // Call Notabene gateway
      const result = await this.kycGateway.verifyKYC(request);

      // Save KYC result to database
      const kycResult = this.kycRepository.create({
        userId: request.userId,
        status: result.status,
        reason: result.reason,
        notabeneId: result.notabeneId,
        completedAt: result.completedAt,
      });
      await this.kycRepository.save(kycResult);

      // Update user KYC status
      const user = await this.userRepository.findOne({ where: { id: request.userId } });
      if (user) {
        user.kycStatus = result.status === 'manual_review' ? 'pending' : result.status;
        await this.userRepository.save(user);
      }

      // Log to ELK (structured log)
      const elkLog = {
        event: 'kyc_verification_completed',
        userId: request.userId,
        notabeneId: result.notabeneId,
        status: result.status,
        reason: result.reason,
        timestamp: new Date().toISOString(),
      };
      console.log(JSON.stringify(elkLog));

      // Send email notification for manual review
      if (result.status === 'manual_review') {
        await this.sendComplianceEmail(
          'compliance@carbonx.au',
          `KYC Manual Review Required`,
          `User ID: ${request.userId}\nNotabene ID: ${result.notabeneId}\nReason: ${result.reason}`
        );
      }

      this.logger.log(`KYC verification completed for user ${request.userId}: ${result.status}`);
      return result;
    } catch (error) {
      this.logger.error(`KYC verification failed for user ${request.userId}`, error);
      throw error;
    }
  }

  async handleWebhook(payload: any): Promise<void> {
    this.logger.log(`Handling KYC webhook: ${payload.event}`);

    if (payload.event === 'kyc.completed') {
      const result = await this.kycGateway.handleWebhook(payload);
      if (result) {
        // Find user by notabeneId or assume payload has userId
        const userId = payload.userId; // Assume webhook includes userId

        const kycResult = this.kycRepository.create({
          userId,
          status: result.status,
          reason: result.reason,
          notabeneId: result.notabeneId,
          completedAt: result.completedAt,
        });
        await this.kycRepository.save(kycResult);

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (user) {
          user.kycStatus = result.status === 'manual_review' ? 'pending' : result.status;
          await this.userRepository.save(user);
        }

        // Log to ELK
        const elkLog = {
          event: 'kyc_webhook_processed',
          userId,
          notabeneId: result.notabeneId,
          status: result.status,
          timestamp: new Date().toISOString(),
        };
        console.log(JSON.stringify(elkLog));
      }
    }
  }

  private async sendComplianceEmail(to: string, subject: string, body: string): Promise<void> {
    // Using nodemailer directly for compliance emails
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@carbonxreserve.com',
      to,
      subject,
      text: body,
    });
  }
}