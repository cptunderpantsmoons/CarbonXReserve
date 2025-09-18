import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Auction } from './auction.entity';

@Entity('bids')
export class Bid {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'auction_id', nullable: true })
  auctionId?: string;

  @ManyToOne(() => Auction, (auction) => auction.id)
  @JoinColumn({ name: 'auction_id' })
  auction?: Auction;

  @Column('uuid', { name: 'seller_id' })
  sellerId!: string;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'seller_id' })
  seller!: User;

  @Column('decimal', { precision: 15, scale: 2 })
  price!: number;

  @Column('text', { name: 'serial_range' })
  serialRange!: string;

  @Column('int')
  vintage!: number;

  @Column({
    type: 'varchar',
    enum: ['pending', 'matched'],
    default: 'pending'
  })
  status!: 'pending' | 'matched';

  @Column('timestamp', { name: 'created_at', default: 'now()' })
  createdAt!: Date;
}