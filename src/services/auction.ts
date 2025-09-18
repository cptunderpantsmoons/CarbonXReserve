import pool from '../db/index';
import { Auction, Bid, Match } from '../types/auction';
import { EmailService } from './email';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';

export class AuctionService {
  private redis: Redis;
  private emailService: EmailService;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.emailService = new EmailService();
  }

  async createAuction(auctionData: Omit<Auction, 'id' | 'status' | 'anreuConfirmed' | 'createdAt'>): Promise<Auction> {
    const id = uuidv4();
    const query = `
      INSERT INTO auctions (id, creator_id, volume, max_price, vintage, status, anreu_confirmed, created_at)
      VALUES ($1, $2, $3, $4, $5, 'active', false, NOW())
      RETURNING *
    `;
    const values = [id, auctionData.creatorId, auctionData.volume, auctionData.maxPrice, auctionData.vintage];

    try {
      const result = await pool.query(query, values);
      const row = result.rows[0];
      return {
        id: row.id,
        creatorId: row.creator_id,
        volume: parseFloat(row.volume),
        maxPrice: parseFloat(row.max_price),
        vintage: row.vintage,
        status: row.status,
        anreuConfirmed: row.anreu_confirmed,
        createdAt: row.created_at,
      };
    } catch (error) {
      console.error('Failed to create auction:', error);
      throw error;
    }
  }

  async submitBid(bidData: Omit<Bid, 'id' | 'status' | 'createdAt'>, bidderEmail: string, creatorEmail: string): Promise<Bid> {
    const id = uuidv4();
    const query = `
      INSERT INTO bids (id, auction_id, bidder_id, price, volume, status, created_at)
      VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
      RETURNING *
    `;
    const values = [id, bidData.auctionId, bidData.bidderId, bidData.price, bidData.volume];

    try {
      const result = await pool.query(query, values);
      const row = result.rows[0];
      const bid = {
        id: row.id,
        auctionId: row.auction_id,
        bidderId: row.bidder_id,
        price: parseFloat(row.price),
        volume: parseFloat(row.volume),
        status: row.status,
        createdAt: row.created_at,
      };

      // Trigger matching after bid submission
      await this.matchBids(bidData.auctionId, bidderEmail, creatorEmail);

      return bid;
    } catch (error) {
      console.error('Failed to submit bid:', error);
      throw error;
    }
  }

  async getMatches(auctionId: string): Promise<Match[]> {
    const query = `
      SELECT * FROM matches
      WHERE auction_id = $1
      ORDER BY matched_at DESC
    `;
    try {
      const result = await pool.query(query, [auctionId]);
      return result.rows.map(row => ({
        id: row.id,
        bidId: row.bid_id,
        auctionId: row.auction_id,
        matchedVolume: parseFloat(row.matched_volume),
        matchedPrice: parseFloat(row.matched_price),
        matchedAt: row.matched_at,
      }));
    } catch (error) {
      console.error('Failed to get matches:', error);
      throw error;
    }
  }

  private async matchBids(auctionId: string, bidderEmail: string, creatorEmail: string): Promise<void> {
    // Get auction details
    const auctionQuery = 'SELECT * FROM auctions WHERE id = $1 AND status = \'active\'';
    const auctionResult = await pool.query(auctionQuery, [auctionId]);
    if (auctionResult.rows.length === 0) return;

    const auction = auctionResult.rows[0];
    let remainingVolume = parseFloat(auction.volume);

    // Get pending bids sorted by highest price, then earliest created_at
    const bidsQuery = `
      SELECT * FROM bids
      WHERE auction_id = $1 AND status = 'pending'
      ORDER BY price DESC, created_at ASC
    `;
    const bidsResult = await pool.query(bidsQuery, [auctionId]);
    const bids = bidsResult.rows;

    for (const bid of bids) {
      if (remainingVolume <= 0) break;

      const bidVolume = parseFloat(bid.volume);
      const bidPrice = parseFloat(bid.price);

      // Check if bid price meets auction max price
      if (bidPrice <= parseFloat(auction.max_price)) {
        const matchedVolume = Math.min(remainingVolume, bidVolume);
        const matchedPrice = bidPrice; // Use bid price as matched price

        // Create match record
        const matchId = uuidv4();
        const matchQuery = `
          INSERT INTO matches (id, bid_id, auction_id, matched_volume, matched_price, matched_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
        `;
        await pool.query(matchQuery, [matchId, bid.id, auctionId, matchedVolume, matchedPrice]);

        // Check for Threshold Transaction Report (TTR) > $10,000 AUD
        const transactionValue = matchedVolume * matchedPrice;
        if (transactionValue > 10000) {
          // Log to ELK
          const elkLog = {
            event: 'threshold_transaction_report',
            matchId,
            auctionId,
            bidderId: bid.bidder_id,
            creatorId: auction.creator_id,
            matchedVolume,
            matchedPrice,
            transactionValue,
            currency: 'AUD',
            timestamp: new Date().toISOString(),
          };
          console.log(JSON.stringify(elkLog));

          // Send AUSTRAC report email
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
            to: 'compliance@carbonx.au',
            subject: 'Threshold Transaction Report - AUSTRAC',
            text: `Transaction Value: ${transactionValue} AUD\nMatch ID: ${matchId}\nBidder: ${bid.bidder_id}\nCreator: ${auction.creator_id}\nVolume: ${matchedVolume}\nPrice: ${matchedPrice}`,
          });
        }

        // Update bid status
        const updateBidQuery = 'UPDATE bids SET status = \'matched\' WHERE id = $1';
        await pool.query(updateBidQuery, [bid.id]);

        remainingVolume -= matchedVolume;

        // Publish match event to Redis
        await this.redis.publish('auction:match', JSON.stringify({
          matchId,
          auctionId,
          bidId: bid.id,
          bidderId: bid.bidder_id,
          creatorId: auction.creator_id,
          matchedVolume,
          matchedPrice,
        }));

        // Send email notifications
        await this.emailService.sendMatchNotification(bidderEmail, creatorEmail, {
          matchId,
          auctionId,
          bidId: bid.id,
          matchedVolume,
          matchedPrice,
        });

        console.log(`Match found: Bid ${bid.id} matched with auction ${auctionId}, volume: ${matchedVolume}, price: ${matchedPrice}`);
      }
    }

    // If auction is fully matched, update status
    if (remainingVolume <= 0) {
      const updateAuctionQuery = 'UPDATE auctions SET status = \'matched\' WHERE id = $1';
      await pool.query(updateAuctionQuery, [auctionId]);
    }
  }

  async confirmAnreuTransfer(auctionId: string): Promise<void> {
    const updateQuery = 'UPDATE auctions SET anreu_confirmed = true WHERE id = $1';
    await pool.query(updateQuery, [auctionId]);

    // Log ANREU confirmation event
    const elkLog = {
      event: 'anreu_transfer_confirmed',
      auctionId,
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(elkLog));
  }

  async settleAuction(auctionId: string): Promise<void> {
    // Check if auction exists and is matched
    const auctionQuery = 'SELECT * FROM auctions WHERE id = $1';
    const auctionResult = await pool.query(auctionQuery, [auctionId]);

    if (auctionResult.rows.length === 0) {
      throw new Error('Auction not found');
    }

    const auction = auctionResult.rows[0];

    if (auction.status !== 'matched') {
      throw new Error('Auction must be matched before settlement');
    }

    // Check ANREU confirmation
    if (!auction.anreu_confirmed) {
      throw new Error('ANREU transfer confirmation required before settlement');
    }

    // Update auction status to settled
    const updateQuery = 'UPDATE auctions SET status = \'settled\' WHERE id = $1';
    await pool.query(updateQuery, [auctionId]);

    // Log settlement event
    const elkLog = {
      event: 'auction_settled',
      auctionId,
      creatorId: auction.creator_id,
      volume: auction.volume,
      maxPrice: auction.max_price,
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(elkLog));
  }
}