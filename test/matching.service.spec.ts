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
});