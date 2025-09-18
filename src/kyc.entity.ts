import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('kyc_results')
export class KycResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'varchar',
    enum: ['approved', 'rejected', 'manual_review'],
  })
  status: 'approved' | 'rejected' | 'manual_review';

  @Column('text')
  reason: string;

  @Column('varchar')
  notabeneId: string;

  @CreateDateColumn({ name: 'created_at' })
  completedAt: Date;
}