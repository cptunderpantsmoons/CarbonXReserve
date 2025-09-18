import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auction } from './auction.entity';
import { Bid } from './bid.entity';
import { EmailService } from './services/email';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    @InjectRepository(Auction)
    private auctionRepository: Repository<Auction>,
    @InjectRepository(Bid)
    private bidRepository: Repository<Bid>,
    private emailService: EmailService,
  ) {}

  async processNewBid(bid: Bid): Promise<void> {
    this.logger.log(`Processing new bid ${bid.id}`);

    // Find open auctions matching the bid's vintage
    const queryBuilder = this.auctionRepository.createQueryBuilder('auction')
      .where('auction.status = :status', { status: 'open' });

    if (bid.vintage) {
      queryBuilder.andWhere('(auction.vintagePref IS NULL OR auction.vintagePref = :vintage)', { vintage: bid.vintage });
    }

    const auctions = await queryBuilder
      .orderBy('auction.maxPrice', 'ASC') // lowest price first
      .getMany();

    for (const auction of auctions) {
      if (bid.price <= auction.maxPrice) {
        // Match found
        await this.matchBidWithAuction(bid, auction);
        break; // Only match with first (lowest price) auction
      }
    }
  }

  private async matchBidWithAuction(bid: Bid, auction: Auction): Promise<void> {
    this.logger.log(`Matching bid ${bid.id} with auction ${auction.id} at price ${bid.price}`);

    // Update statuses and assign auction to bid
    // Note: Settlement will only occur after ANREU confirmation
    auction.status = 'matched';
    bid.status = 'matched';
    bid.auctionId = auction.id;

    await this.auctionRepository.save(auction);
    await this.bidRepository.save(bid);

    // Emit match event (log)
    const matchEvent = {
      auctionId: auction.id,
      bidId: bid.id,
      matchedPrice: bid.price,
      serialRange: bid.serialRange,
    };
    console.log(`MATCH_EVENT: ${JSON.stringify(matchEvent)}`);

    // Log structured event for ELK
    const elkLog = {
      event: 'auction_match',
      auctionId: auction.id,
      bidId: bid.id,
      matchedPrice: bid.price,
      serialRange: bid.serialRange,
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(elkLog));

    // Get buyer and seller emails
    const buyer = await this.auctionRepository.findOne({
      where: { id: auction.id },
      relations: ['buyer']
    });
    const seller = await this.bidRepository.findOne({
      where: { id: bid.id },
      relations: ['seller']
    });

    if (buyer?.buyer?.email && seller?.seller?.email) {
      await this.emailService.sendMatchNotification(
        buyer.buyer.email,
        seller.seller.email,
        {
          auctionId: auction.id,
          bidId: bid.id,
          matchedPrice: bid.price,
          matchedVolume: auction.volume, // assuming full volume match
        }
      );
    }

    this.logger.log(`Bid ${bid.id} matched with auction ${auction.id}`);
  }
}