import { Entity, PrimaryGeneratedColumn, Column, OneToMany, DeleteDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text')
  name!: string;

  @Column('text', { unique: true })
  abn!: string;

  @Column('text', { nullable: true, name: 'safeguard_facility_id' })
  safeguardFacilityId?: string;

  @Column('timestamp', { name: 'created_at', default: 'now()' })
  createdAt!: Date;

  // Ensure PII hook is applied at DB level
  @Column('text', { name: 'encrypted_abn' })
  encryptedAbn!: string;

  // Relationship definitions
  @OneToMany(() => User, (user) => user.orgId)
  users!: User[];
}
