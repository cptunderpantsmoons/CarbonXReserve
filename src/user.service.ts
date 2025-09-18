import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Organization } from './org.entity';
import * as crypto from 'crypto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private orgRepository: Repository<Organization>,
  ) {}

  async register(email: string, abn: string, orgName: string): Promise<{ user: User; organization: Organization; token: string }> {
    const encryptedEmail = this.encrypt(email);
    const existingUser = await this.userRepository.findOne({ where: { email: encryptedEmail } });
    if (existingUser) {
      throw new Error('Email already exists');
    }

    const encryptedAbn = this.encrypt(abn);
    let org = await this.orgRepository.findOne({ where: { abn: encryptedAbn } });
    if (!org) {
      org = this.orgRepository.create({
        name: orgName,
        abn: encryptedAbn,
        encryptedAbn,
        createdAt: new Date(),
      });
      await this.orgRepository.save(org);
      this.logger.log(`Created organization ${org.id} for ABN ${this.maskAbn(abn)}`);
    }

    const user = this.userRepository.create({
      email: encryptedEmail,
      orgId: org.id,
      kycStatus: 'pending',
      role: 'viewer',
      createdAt: new Date(),
    });
    await this.userRepository.save(user);
    this.logger.log(`Created user ${user.id} with email ${this.maskEmail(email)}`);

    // Mock JWT token
    const token = 'mock-jwt-token';

    return { user, organization: org, token };
  }

  async findUser(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id }, relations: ['organization'] });
  }

  async updateUser(id: string, updates: Partial<Pick<User, 'kycStatus' | 'role'>>): Promise<User> {
    const user = await this.findUser(id);
    if (!user) throw new Error('User not found');
    Object.assign(user, updates);
    await this.userRepository.save(user);
    this.logger.log(`Updated user ${id}: ${JSON.stringify(updates)}`);
    return user;
  }

  private encrypt(data: string): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync('your-secret-key', 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(data: string): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync('your-secret-key', 'salt', 32);
    const [ivHex, encrypted] = data.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  public maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    return `${local.charAt(0)}***@${domain}`;
  }

  public maskAbn(abn: string): string {
    return abn.slice(0, 3) + '***' + abn.slice(-3);
  }

  public decryptData(data: string): string {
    return this.decrypt(data);
  }
}