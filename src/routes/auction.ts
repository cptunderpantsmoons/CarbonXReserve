import express, { Request, Response } from 'express';
import { AuctionService } from '../services/auction';
import { Auction, Bid } from '../types/auction';

const router = express.Router();
const auctionService = new AuctionService();

// POST /auctions → create new auction
router.post('/', async (req: Request, res: Response) => {
  try {
    const auctionData: Omit<Auction, 'id' | 'status' | 'createdAt'> = req.body;
    const auction = await auctionService.createAuction(auctionData);
    res.status(201).json(auction);
  } catch (error) {
    console.error('Error creating auction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auctions/:id/bids → submit bid on auction
router.post('/:id/bids', async (req: Request, res: Response) => {
  try {
    const auctionId = req.params.id;
    const bidData: Omit<Bid, 'id' | 'auctionId' | 'status' | 'createdAt'> & { bidderEmail: string; creatorEmail: string } = req.body;
    const bid = {
      ...bidData,
      auctionId,
    };
    const createdBid = await auctionService.submitBid(bid, bidData.bidderEmail, bidData.creatorEmail);
    res.status(201).json(createdBid);
  } catch (error) {
    console.error('Error submitting bid:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /auctions/:id/matches → get matches for auction
router.get('/:id/matches', async (req: Request, res: Response) => {
  try {
    const auctionId = req.params.id;
    const matches = await auctionService.getMatches(auctionId);
    res.json(matches);
  } catch (error) {
    console.error('Error getting matches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auctions/:id/confirm-anreu → confirm ANREU transfer
router.post('/:id/confirm-anreu', async (req: Request, res: Response) => {
  try {
    const auctionId = req.params.id;
    await auctionService.confirmAnreuTransfer(auctionId);
    res.json({ message: 'ANREU transfer confirmed successfully' });
  } catch (error) {
    console.error('Error confirming ANREU transfer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auctions/:id/settle → settle auction (requires ANREU confirmation)
router.post('/:id/settle', async (req: Request, res: Response) => {
  try {
    const auctionId = req.params.id;
    await auctionService.settleAuction(auctionId);
    res.json({ message: 'Auction settled successfully' });
  } catch (error) {
    console.error('Error settling auction:', error);
    if (error.message.includes('ANREU transfer confirmation required')) {
      res.status(400).json({ error: error.message });
    } else if (error.message.includes('must be matched before settlement')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;