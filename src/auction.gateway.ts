import { Injectable } from '@nestjs/common';
import { EmailService } from './services/email';

@Injectable()
export class AuctionGateway {
  constructor(private emailService: EmailService) {}

  async sendMatchNotification(buyerEmail: string, sellerEmail: string, details: {
    auctionId: string;
    bidId: string;
    matchedPrice: number;
    matchedVolume: number;
  }): Promise<void> {
    await this.emailService.sendMatchNotification(buyerEmail, sellerEmail, details);
  }

  async sendSettlementConfirmation(email: string, auctionId: string): Promise<void> {
    // For settlement confirmation, use simple nodemailer directly
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
      to: email,
      subject: `Settlement Confirmed - Auction #${auctionId}`,
      text: `The ANREU transfer for auction ${auctionId} has been confirmed. The settlement is now complete.`,
    });
  }
}