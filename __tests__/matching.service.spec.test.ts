import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MatchingService } from '../src/matching.service';
import { Auction } from '../src/auction.entity';
import { Bid } from '../src/bid.entity';
import { EmailService } from '../src/services/email';

describe('MatchingService', () => {
  let service: MatchingService;
  let auctionRepo: any;
  let bidRepo: any;
  let emailService: any;
  let queryBuilder: any;

  beforeEach(async () => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchingService,
        {
          provide: getRepositoryToken(Auction),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Bid),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendMatchNotification: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MatchingService>(MatchingService);
    auctionRepo = module.get(getRepositoryToken(Auction));
    bidRepo = module.get(getRepositoryToken(Bid));
    emailService = module.get(EmailService);
  });

  it('should match bid with lowest price auction first', async () => {
    const bid = { id: 'bid1', price: 20, vintage: 2020, sellerId: 'seller1' };
    const auctions = [
      { id: 'auc1', buyerId: 'buyer1', maxPrice: 30, vintagePref: 2020, status: 'open' },
      { id: 'auc2', buyerId: 'buyer2', maxPrice: 25, vintagePref: 2020, status: 'open' },
    ];

    queryBuilder.getMany.mockResolvedValue(auctions);
    auctionRepo.findOne.mockResolvedValue({ buyer: { email: 'buyer@test.com' } });
    bidRepo.findOne.mockResolvedValue({ seller: { email: 'seller@test.com' } });

    await service.processNewBid(bid as Bid);

    expect(auctionRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'auc2', status: 'matched' }));
    expect(bidRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'bid1', status: 'matched', auctionId: 'auc2' }));
  });

  it('should filter by vintage preference', async () => {
    const bid = { id: 'bid1', price: 20, vintage: 2021, sellerId: 'seller1' };
    const auctions = [
      { id: 'auc1', buyerId: 'buyer1', maxPrice: 25, vintagePref: 2020, status: 'open' },
    ];

    queryBuilder.getMany.mockResolvedValue(auctions);

    await service.processNewBid(bid as Bid);

    expect(auctionRepo.save).not.toHaveBeenCalled();
    expect(bidRepo.save).not.toHaveBeenCalled();
  });

  it('should prevent double matching', async () => {
    const bid = { id: 'bid1', price: 20, vintage: 2020, sellerId: 'seller1' };
    const auctions = [
      { id: 'auc1', buyerId: 'buyer1', maxPrice: 25, vintagePref: 2020, status: 'matched' },
    ];

    queryBuilder.getMany.mockResolvedValue(auctions);

    await service.processNewBid(bid as Bid);

    expect(auctionRepo.save).not.toHaveBeenCalled();
    expect(bidRepo.save).not.toHaveBeenCalled();
  });

  // Edge case tests
  it('should handle no auctions available', async () => {
    const bid = { id: 'bid1', price: 20, vintage: 2020, sellerId: 'seller1' };
    const auctions: Auction[] = [];

    queryBuilder.getMany.mockResolvedValue(auctions);

    await service.processNewBid(bid as Bid);

    expect(auctionRepo.save).not.toHaveBeenCalled();
    expect(bidRepo.save).not.toHaveBeenCalled();
    expect(emailService.sendMatchNotification).not.toHaveBeenCalled();
  });

  it('should handle multiple auctions with different vintages', async () => {
    const bid = { id: 'bid1', price: 20, vintage: 2020, sellerId: 'seller1' };
    const auctions = [
      { id: 'auc1', buyerId: 'buyer1', maxPrice: 25, vintagePref: 2021, status: 'open' },
      { id: 'auc2', buyerId: 'buyer2', maxPrice: 30, vintagePref: 2020, status: 'open' },
      { id: 'auc3', buyerId: 'buyer3', maxPrice: 35, vintagePref: null, status: 'open' }, // No vintage preference
    ];

    queryBuilder.getMany.mockResolvedValue(auctions);
    auctionRepo.findOne.mockResolvedValue({ buyer: { email: 'buyer@test.com' } });
    bidRepo.findOne.mockResolvedValue({ seller: { email: 'seller@test.com' } });

    await service.processNewBid(bid as Bid);

    // Should match with auc2 (lowest price among matching vintages)
    expect(auctionRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'auc2', status: 'matched' }));
    expect(bidRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'bid1', status: 'matched', auctionId: 'auc2' }));
  });

  it('should prioritize price when multiple auctions available', async () => {
    const bid = { id: 'bid1', price: 20, vintage: 2020, sellerId: 'seller1' };
    const auctions = [
      { id: 'auc1', buyerId: 'buyer1', maxPrice: 35, vintagePref: 2020, status: 'open' },
      { id: 'auc2', buyerId: 'buyer2', maxPrice: 25, vintagePref: 2020, status: 'open' },
      { id: 'auc3', buyerId: 'buyer3', maxPrice: 30, vintagePref: 2020, status: 'open' },
    ];

    queryBuilder.getMany.mockResolvedValue(auctions);
    auctionRepo.findOne.mockResolvedValue({ buyer: { email: 'buyer@test.com' } });
    bidRepo.findOne.mockResolvedValue({ seller: { email: 'seller@test.com' } });

    await service.processNewBid(bid as Bid);

    // Should match with auc2 (lowest maxPrice)
    expect(auctionRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'auc2', status: 'matched' }));
    expect(bidRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'bid1', status: 'matched', auctionId: 'auc2' }));
  });

  it('should prevent double matching with race condition simulation', async () => {
    const bid = { id: 'bid1', price: 20, vintage: 2020, sellerId: 'seller1' };
    const auctions = [
      { id: 'auc1', buyerId: 'buyer1', maxPrice: 25, vintagePref: 2020, status: 'open' },
    ];

    queryBuilder.getMany.mockResolvedValue(auctions);

    // Simulate race condition - auction becomes matched between query and save
    auctionRepo.save.mockRejectedValueOnce(new Error('Status already changed'));
    auctionRepo.findOne.mockResolvedValue({ buyer: { email: 'buyer@test.com' } });
    bidRepo.findOne.mockResolvedValue({ seller: { email: 'seller@test.com' } });

    await expect(service.processNewBid(bid as Bid)).rejects.toThrow('Status already changed');

    expect(auctionRepo.save).toHaveBeenCalled();
    expect(bidRepo.save).not.toHaveBeenCalled(); // Bid should not be saved if auction save fails
  });

  it('should emit match event on successful match', async () => {
    const bid = { id: 'bid1', price: 20, vintage: 2020, sellerId: 'seller1', serialRange: '1000000-1000100' };
    const auctions = [
      { id: 'auc1', buyerId: 'buyer1', maxPrice: 25, vintagePref: 2020, status: 'open', volume: 100 },
    ];

    queryBuilder.getMany.mockResolvedValue(auctions);
    auctionRepo.findOne.mockResolvedValue({ buyer: { email: 'buyer@test.com' } });
    bidRepo.findOne.mockResolvedValue({ seller: { email: 'seller@test.com' } });

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await service.processNewBid(bid as Bid);

    expect(consoleSpy).toHaveBeenCalledWith('MATCH_EVENT: {"auctionId":"auc1","bidId":"bid1","matchedPrice":20,"serialRange":"1000000-1000100"}');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/^\{"event":"auction_match".*\}/));

    consoleSpy.mockRestore();
  });

  it('should handle bid without vintage', async () => {
    const bid = { id: 'bid1', price: 20, vintage: null, sellerId: 'seller1' };
    const auctions = [
      { id: 'auc1', buyerId: 'buyer1', maxPrice: 25, vintagePref: null, status: 'open' },
      { id: 'auc2', buyerId: 'buyer2', maxPrice: 30, vintagePref: 2020, status: 'open' },
    ];

    queryBuilder.getMany.mockResolvedValue(auctions);
    auctionRepo.findOne.mockResolvedValue({ buyer: { email: 'buyer@test.com' } });
    bidRepo.findOne.mockResolvedValue({ seller: { email: 'seller@test.com' } });

    await service.processNewBid(bid as Bid);

    // Should match with auc1 (auction with null vintage preference)
    expect(auctionRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'auc1', status: 'matched' }));
    expect(bidRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'bid1', status: 'matched', auctionId: 'auc1' }));
  });

  it('should handle auction without vintage preference', async () => {
    const bid = { id: 'bid1', price: 20, vintage: 2020, sellerId: 'seller1' };
    const auctions = [
      { id: 'auc1', buyerId: 'buyer1', maxPrice: 25, vintagePref: null, status: 'open' },
      { id: 'auc2', buyerId: 'buyer2', maxPrice: 30, vintagePref: 2021, status: 'open' },
    ];

    queryBuilder.getMany.mockResolvedValue(auctions);
    auctionRepo.findOne.mockResolvedValue({ buyer: { email: 'buyer@test.com' } });
    bidRepo.findOne.mockResolvedValue({ seller: { email: 'seller@test.com' } });

    await service.processNewBid(bid as Bid);

    // Should match with auc1 (auction with null vintage preference)
    expect(auctionRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'auc1', status: 'matched' }));
    expect(bidRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'bid1', status: 'matched', auctionId: 'auc1' }));
  });

  it('should send email notification on match', async () => {
    const bid = { id: 'bid1', price: 20, vintage: 2020, sellerId: 'seller1' };
    const auctions = [
      { id: 'auc1', buyerId: 'buyer1', maxPrice: 25, vintagePref: 2020, status: 'open', volume: 100 },
    ];

    queryBuilder.getMany.mockResolvedValue(auctions);
    auctionRepo.findOne.mockResolvedValue({ buyer: { email: 'buyer@test.com' } });
    bidRepo.findOne.mockResolvedValue({ seller: { email: 'seller@test.com' } });

    await service.processNewBid(bid as Bid);

    expect(emailService.sendMatchNotification).toHaveBeenCalledWith(
      'buyer@test.com',
      'seller@test.com',
      {
        auctionId: 'auc1',
        bidId: 'bid1',
        matchedPrice: 20,
        matchedVolume: 100,
      }
    );
  });

  it('should handle email service failure gracefully', async () => {
    const bid = { id: 'bid1', price: 20, vintage: 2020, sellerId: 'seller1' };
    const auctions = [
      { id: 'auc1', buyerId: 'buyer1', maxPrice: 25, vintagePref: 2020, status: 'open' },
    ];

    queryBuilder.getMany.mockResolvedValue(auctions);
    auctionRepo.findOne.mockResolvedValue({ buyer: { email: 'buyer@test.com' } });
    bidRepo.findOne.mockResolvedValue({ seller: { email: 'seller@test.com' } });
    emailService.sendMatchNotification.mockRejectedValue(new Error('Email service down'));

    // Match should still succeed even if email fails
    await expect(service.processNewBid(bid as Bid)).resolves.toBeUndefined();

    expect(auctionRepo.save).toHaveBeenCalled();
    expect(bidRepo.save).toHaveBeenCalled();
  });
});