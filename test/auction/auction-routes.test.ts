import request from 'supertest';
import express from 'express';
import auctionRouter from '../../src/routes/auction';
import { AuctionService } from '../../src/services/auction';

// Mock the AuctionService
jest.mock('../../src/services/auction');

const mockAuctionService = AuctionService as jest.MockedClass<typeof AuctionService>;

describe('Auction Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/auction', auctionRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auction', () => {
    it('should create auction successfully', async () => {
      const mockAuction = {
        id: 'auction-id',
        creatorId: 'user1',
        volume: 100,
        maxPrice: 50,
        vintage: '2023',
        status: 'active' as const,
        createdAt: new Date()
      };

      mockAuctionService.prototype.createAuction.mockResolvedValue(mockAuction);

      const response = await request(app)
        .post('/api/v1/auction')
        .send({
          creatorId: 'user1',
          volume: 100,
          maxPrice: 50,
          vintage: '2023'
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockAuction);
      expect(mockAuctionService.prototype.createAuction).toHaveBeenCalledWith({
        creatorId: 'user1',
        volume: 100,
        maxPrice: 50,
        vintage: '2023'
      });
    });

    it('should return 500 on error', async () => {
      mockAuctionService.prototype.createAuction.mockRejectedValue(new Error('DB Error'));

      const response = await request(app)
        .post('/api/v1/auction')
        .send({
          creatorId: 'user1',
          volume: 100,
          maxPrice: 50,
          vintage: '2023'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('POST /api/v1/auction/:id/bids', () => {
    it('should submit bid successfully', async () => {
      const mockBid = {
        id: 'bid-id',
        auctionId: 'auction-id',
        bidderId: 'bidder1',
        price: 40,
        volume: 50,
        status: 'pending' as const,
        createdAt: new Date()
      };

      mockAuctionService.prototype.submitBid.mockResolvedValue(mockBid);

      const response = await request(app)
        .post('/api/v1/auction/auction-id/bids')
        .send({
          bidderId: 'bidder1',
          price: 40,
          volume: 50,
          bidderEmail: 'bidder@email.com',
          creatorEmail: 'creator@email.com'
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockBid);
      expect(mockAuctionService.prototype.submitBid).toHaveBeenCalledWith(
        {
          auctionId: 'auction-id',
          bidderId: 'bidder1',
          price: 40,
          volume: 50
        },
        'bidder@email.com',
        'creator@email.com'
      );
    });

    it('should return 500 on error', async () => {
      mockAuctionService.prototype.submitBid.mockRejectedValue(new Error('DB Error'));

      const response = await request(app)
        .post('/api/v1/auction/auction-id/bids')
        .send({
          bidderId: 'bidder1',
          price: 40,
          volume: 50,
          bidderEmail: 'bidder@email.com',
          creatorEmail: 'creator@email.com'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('GET /api/v1/auction/:id/matches', () => {
    it('should return matches successfully', async () => {
      const mockMatches = [
        {
          id: 'match-id',
          bidId: 'bid-id',
          auctionId: 'auction-id',
          matchedVolume: 50,
          matchedPrice: 40,
          matchedAt: new Date()
        }
      ];

      mockAuctionService.prototype.getMatches.mockResolvedValue(mockMatches);

      const response = await request(app)
        .get('/api/v1/auction/auction-id/matches');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMatches);
      expect(mockAuctionService.prototype.getMatches).toHaveBeenCalledWith('auction-id');
    });

    it('should return 500 on error', async () => {
      mockAuctionService.prototype.getMatches.mockRejectedValue(new Error('DB Error'));

      const response = await request(app)
        .get('/api/v1/auction/auction-id/matches');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });
});