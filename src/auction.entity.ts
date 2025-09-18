import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('auctions')
export class Auction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'buyer_id' })
  buyerId!: string;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'buyer_id' })
  buyer!: User;

  @Column('decimal', { precision: 15, scale: 2 })
  volume!: number;

  @Column('decimal', { precision: 15, scale: 2, name: 'max_price' })
  maxPrice!: number;

  @Column('int', { nullable: true, name: 'vintage_pref' })
  vintagePref?: number;

  @Column({
    type: 'varchar',
    enum: ['open', 'matched', 'settled'],
    default: 'open'
  })
  status!: 'open' | 'matched' | 'settled';

  @Column('boolean', { name: 'anreu_confirmed', default: false })
  anreuConfirmed!: boolean;

  @Column('timestamp', { name: 'created_at', default: 'now()' })
  createdAt!: Date;
}