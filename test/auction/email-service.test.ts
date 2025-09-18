import nodemailer from 'nodemailer';
import { EmailService } from '../../src/services/email';

// Mock nodemailer
jest.mock('nodemailer');

const mockTransporter = {
  sendMail: jest.fn()
};

(nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

describe('EmailService', () => {
  let emailService: EmailService;

  beforeEach(() => {
    emailService = new EmailService();
    jest.clearAllMocks();
  });

  describe('sendMatchNotification', () => {
    it('should send match notification emails successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: '123' });

      const matchDetails = {
        matchId: 'match-id',
        auctionId: 'auction-id',
        bidId: 'bid-id',
        matchedVolume: 100,
        matchedPrice: 50
      };

      await emailService.sendMatchNotification('bidder@example.com', 'creator@example.com', matchDetails);

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2);

      // Check bidder email
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@carbonxreserve.com',
        to: 'bidder@example.com',
        subject: 'Auction Match Notification',
        html: expect.stringContaining('Your bid has been matched')
      });

      // Check creator email
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@carbonxreserve.com',
        to: 'creator@example.com',
        subject: 'Auction Match Notification',
        html: expect.stringContaining('Your auction has been matched')
      });
    });

    it('should include correct match details in bidder email', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: '123' });

      const matchDetails = {
        matchId: 'match-123',
        auctionId: 'auction-456',
        bidId: 'bid-789',
        matchedVolume: 75,
        matchedPrice: 42
      };

      await emailService.sendMatchNotification('bidder@example.com', 'creator@example.com', matchDetails);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'bidder@example.com',
          html: expect.stringContaining('Bid ID: bid-789')
        })
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Matched Volume: 75 tons')
        })
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Matched Price: $42 per ton')
        })
      );
    });

    it('should include correct match details in creator email', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: '123' });

      const matchDetails = {
        matchId: 'match-123',
        auctionId: 'auction-456',
        bidId: 'bid-789',
        matchedVolume: 75,
        matchedPrice: 42
      };

      await emailService.sendMatchNotification('bidder@example.com', 'creator@example.com', matchDetails);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'creator@example.com',
          html: expect.stringContaining('Auction ID: auction-456')
        })
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Bid ID: bid-789')
        })
      );
    });

    it('should throw error if email sending fails', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP Error'));

      const matchDetails = {
        matchId: 'match-id',
        auctionId: 'auction-id',
        bidId: 'bid-id',
        matchedVolume: 100,
        matchedPrice: 50
      };

      await expect(
        emailService.sendMatchNotification('bidder@example.com', 'creator@example.com', matchDetails)
      ).rejects.toThrow('SMTP Error');
    });

    it('should use environment SMTP settings', () => {
      // Check if createTransporter is called with correct config
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    });

    it('should use default SMTP host if not set', () => {
      const originalEnv = process.env.SMTP_HOST;
      delete process.env.SMTP_HOST;

      // Reinitialize to check default
      const newEmailService = new EmailService();

      expect(nodemailer.createTransport).toHaveBeenLastCalledWith(
        expect.objectContaining({
          host: 'smtp.gmail.com'
        })
      );

      // Restore
      process.env.SMTP_HOST = originalEnv;
    });
  });
});