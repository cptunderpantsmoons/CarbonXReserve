import { AuctionService } from '../../src/services/auction';
import { EmailService } from '../../src/services/email';
import pool from '../../src/db/index';
import Redis from 'ioredis';

// Mock dependencies
jest.mock('../../src/db/index');
jest.mock('../../src/services/email');
jest.mock('ioredis');

const mockPool = pool as any;
const mockRedis = Redis as any;
const mockEmailService = EmailService as any;

describe('AuctionService', () => {
  let auctionService: AuctionService;
  let mockRedisInstance: jest.Mocked<Redis>;
  let mockEmailServiceInstance: jest.Mocked<EmailService>;

  beforeEach(() => {
    mockRedisInstance = new mockRedis() as jest.Mocked<Redis>;
    mockEmailServiceInstance = new mockEmailService() as jest.Mocked<EmailService>;
    auctionService = new AuctionService();
    (auctionService as any).redis = mockRedisInstance;
    (auctionService as any).emailService = mockEmailServiceInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAuction', () => {
    it('should create a new auction successfully', async () => {
      const auctionData = {
        creatorId: 'user1',
        volume: 100,
        maxPrice: 50,
        vintage: '2023'
      };

      const mockResult = {
        rows: [{
          id: 'auction-id',
          creator_id: 'user1',
          volume: '100.00',
          max_price: '50.00',
          vintage: '2023',
          status: 'active',
          created_at: new Date()
        }]
      };

      mockPool.query.mockResolvedValue(mockResult);

      const result = await auctionService.createAuction(auctionData);

      expect(result.id).toBe('auction-id');
      expect(result.creatorId).toBe('user1');
      expect(result.volume).toBe(100);
      expect(mockPool.query).toHaveBeenCalled();
    });

    it('should throw error on database failure', async () => {
      mockPool.query.mockRejectedValue(new Error('DB Error'));

      await expect(auctionService.createAuction({
        creatorId: 'user1',
        volume: 100,
        maxPrice: 50,
        vintage: '2023'
      })).rejects.toThrow('DB Error');
    });
  });

  describe('submitBid', () => {
    it('should submit bid and trigger matching successfully', async () => {
      const bidData = {
        auctionId: 'auction-id',
        bidderId: 'bidder1',
        price: 40,
        volume: 50
      };

      const mockBidResult = {
        rows: [{
          id: 'bid-id',
          auction_id: 'auction-id',
          bidder_id: 'bidder1',
          price: '40.00',
          volume: '50.00',
          status: 'pending',
          created_at: new Date()
        }]
      };

      mockPool.query
        .mockResolvedValueOnce(mockBidResult) // Insert bid
        .mockResolvedValueOnce({ rows: [{ id: 'auction-id', status: 'active', creator_id: 'creator1', max_price: '50.00', volume: '100.00' }] }) // Get auction
        .mockResolvedValueOnce({ rows: [] }); // Get bids (empty)

      const result = await auctionService.submitBid(bidData, 'bidder@email.com', 'creator@email.com');

      expect(result.id).toBe('bid-id');
      expect(result.price).toBe(40);
      expect(mockPool.query).toHaveBeenCalledTimes(3);
    });

    it('should throw error on bid submission failure', async () => {
      mockPool.query.mockRejectedValue(new Error('DB Error'));

      await expect(auctionService.submitBid({
        auctionId: 'auction-id',
        bidderId: 'bidder1',
        price: 40,
        volume: 50
      }, 'bidder@email.com', 'creator@email.com')).rejects.toThrow('DB Error');
    });
  });

  describe('getMatches', () => {
    it('should return matches for an auction', async () => {
      const mockMatches = {
        rows: [{
          id: 'match-id',
          bid_id: 'bid-id',
          auction_id: 'auction-id',
          matched_volume: '50.00',
          matched_price: '40.00',
          matched_at: new Date()
        }]
      };

      mockPool.query.mockResolvedValue(mockMatches);

      const result = await auctionService.getMatches('auction-id');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('match-id');
      expect(result[0].matchedVolume).toBe(50);
    });
  });

  describe('matchBids (private)', () => {
    it('should match bids correctly', async () => {
      const auctionService = new AuctionService();
      const matchBids = (auctionService as any).matchBids.bind(auctionService);

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 'auction-id', status: 'active', creator_id: 'creator1', max_price: '50.00', volume: '100.00' }] }) // Get auction
        .mockResolvedValueOnce({
          rows: [
            { id: 'bid1', auction_id: 'auction-id', bidder_id: 'bidder1', price: '45.00', volume: '50.00', status: 'pending', created_at: new Date('2023-01-01') },
            { id: 'bid2', auction_id: 'auction-id', bidder_id: 'bidder2', price: '40.00', volume: '30.00', status: 'pending', created_at: new Date('2023-01-02') }
          ]
        }) // Get bids
        .mockResolvedValueOnce({}) // Insert match
        .mockResolvedValueOnce({}) // Update bid
        .mockResolvedValueOnce({}); // Update auction

      mockRedisInstance.publish.mockResolvedValue(1);
      mockEmailServiceInstance.sendMatchNotification.mockResolvedValue();

      await matchBids('auction-id', 'bidder@email.com', 'creator@email.com');

      expect(mockRedisInstance.publish).toHaveBeenCalledWith('auction:match', expect.any(String));
      expect(mockEmailServiceInstance.sendMatchNotification).toHaveBeenCalled();
      expect(mockPool.query).toHaveBeenCalledWith('UPDATE auctions SET status = \'matched\' WHERE id = $1', ['auction-id']);
    });

    it('should not match if auction is not active', async () => {
      const auctionService = new AuctionService();
      const matchBids = (auctionService as any).matchBids.bind(auctionService);

      mockPool.query.mockResolvedValueOnce({ rows: [{ status: 'closed' }] }); // Auction not active

      await matchBids('auction-id', 'bidder@email.com', 'creator@email.com');

      expect(mockRedisInstance.publish).not.toHaveBeenCalled();
      expect(mockEmailServiceInstance.sendMatchNotification).not.toHaveBeenCalled();
    });
  });
});