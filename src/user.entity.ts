import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, DeleteDateColumn } from 'typeorm';
import { Organization } from './org.entity';
import { IsEmail, IsEnum } from 'class-validator';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { unique: true })
  email!: string;

  @Column('uuid', { name: 'org_id' })
  orgId!: string;

  @ManyToOne(() => Organization, (org) => org.id)
  @JoinColumn({ name: 'org_id' })
  organization!: Organization;

  @Column({
    type: 'varchar',
    enum: ['pending', 'approved', 'rejected', 'manual_review'],
    default: 'pending'
  })
  @IsEnum(['pending', 'approved', 'rejected', 'manual_review'])
  kycStatus!: 'pending' | 'approved' | 'rejected' | 'manual_review';

  @Column({
    type: 'varchar',
    enum: ['admin', 'trader', 'viewer'],
    default: 'viewer'
  })
  @IsEnum(['admin', 'trader', 'viewer'])
  role!: 'admin' | 'trader' | 'viewer';

  @Column('timestamp', { name: 'created_at', default: 'now()' })
  createdAt!: Date;
}
