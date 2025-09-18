import nodemailer from 'nodemailer';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendMatchNotification(
    bidderEmail: string,
    creatorEmail: string,
    matchDetails: {
      matchId: string;
      auctionId: string;
      bidId: string;
      matchedVolume: number;
      matchedPrice: number;
    }
  ): Promise<void> {
    const bidderSubject = 'Auction Match Notification';
    const bidderHtml = `
      <h2>Congratulations! Your bid has been matched.</h2>
      <p>Your bid ID: ${matchDetails.bidId}</p>
      <p>Matched Volume: ${matchDetails.matchedVolume} tons</p>
      <p>Matched Price: $${matchDetails.matchedPrice} per ton</p>
      <p>Auction ID: ${matchDetails.auctionId}</p>
      <p>Please contact the auction creator to complete the transaction.</p>
    `;

    const creatorSubject = 'Auction Match Notification';
    const creatorHtml = `
      <h2>Your auction has been matched!</h2>
      <p>Auction ID: ${matchDetails.auctionId}</p>
      <p>Bid ID: ${matchDetails.bidId}</p>
      <p>Matched Volume: ${matchDetails.matchedVolume} tons</p>
      <p>Matched Price: $${matchDetails.matchedPrice} per ton</p>
      <p>Please contact the bidder to complete the transaction.</p>
    `;

    try {
      // Send to bidder
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@carbonxreserve.com',
        to: bidderEmail,
        subject: bidderSubject,
        html: bidderHtml,
      });

      // Send to creator
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@carbonxreserve.com',
        to: creatorEmail,
        subject: creatorSubject,
        html: creatorHtml,
      });

      console.log(`Match notification emails sent for match ${matchDetails.matchId}`);
    } catch (error) {
      console.error('Failed to send match notification emails:', error);
      throw error;
    }
  }
}