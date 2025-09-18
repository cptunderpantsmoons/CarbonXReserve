export interface Auction {
  id: string;
  creatorId: string;
  volume: number;
  maxPrice: number;
  vintage: string;
  status: 'active' | 'closed' | 'matched' | 'settled';
  anreuConfirmed: boolean;
  createdAt: Date;
}

export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  price: number;
  volume: number;
  status: 'pending' | 'matched' | 'rejected';
  createdAt: Date;
}

export interface Match {
  id: string;
  bidId: string;
  auctionId: string;
  matchedVolume: number;
  matchedPrice: number;
  matchedAt: Date;
}