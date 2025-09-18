import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { KycService } from '../../src/kyc.service';
import { KycGateway } from '../../src/kyc.gateway';
import { User } from '../../src/user.entity';
import { KycResult } from '../../src/kyc.entity';
import { EmailService } from '../../src/services/email';
import { KYCRequest } from '../../src/types/kyc';

describe('KycService', () => {
  let service: KycService;
  let mockGateway: jest.Mocked<KycGateway>;
  let mockUserRepo: jest.Mocked<any>;
  let mockKycRepo: jest.Mocked<any>;
  let mockEmailService: jest.Mocked<EmailService>;

  beforeEach(async () => {
    const mockGatewayValue = {
      verifyKYC: jest.fn(),
      handleWebhook: jest.fn(),
    };

    const mockUserRepoValue = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const mockKycRepoValue = {
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockEmailServiceValue = {
      // Mock methods if needed
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KycService,
        { provide: KycGateway, useValue: mockGatewayValue },
        { provide: getRepositoryToken(User), useValue: mockUserRepoValue },
        { provide: getRepositoryToken(KycResult), useValue: mockKycRepoValue },
        { provide: EmailService, useValue: mockEmailServiceValue },
      ],
    }).compile();

    service = module.get<KycService>(KycService);
    mockGateway = module.get(KycGateway);
    mockUserRepo = module.get(getRepositoryToken(User));
    mockKycRepo = module.get(getRepositoryToken(KycResult));
    mockEmailService = module.get(EmailService);
  });

  it('should verify KYC and return approved result', async () => {
    const mockRequest: KYCRequest = {
      userId: 'user-123',
      fullName: 'John Doe',
      idDoc: { buffer: Buffer.from('test'), mimetype: 'image/jpeg' } as Express.Multer.File,
      proofOfAddress: { buffer: Buffer.from('test'), mimetype: 'application/pdf' } as Express.Multer.File,
    };

    const mockResult = {
      status: 'approved' as const,
      reason: 'Verification successful',
      notabeneId: 'nb-456',
      completedAt: new Date(),
    };

    mockGateway.verifyKYC.mockResolvedValue(mockResult);
    mockUserRepo.findOne.mockResolvedValue({ id: 'user-123', kycStatus: 'pending' });
    mockKycRepo.create.mockReturnValue(mockResult);
    mockKycRepo.save.mockResolvedValue(mockResult);

    const result = await service.verifyKYC(mockRequest);

    expect(result).toEqual(mockResult);
    expect(mockGateway.verifyKYC).toHaveBeenCalledWith(mockRequest);
    expect(mockUserRepo.save).toHaveBeenCalledWith({ id: 'user-123', kycStatus: 'approved' });
    expect(mockKycRepo.save).toHaveBeenCalled();
  });

  it('should verify KYC and return manual_review result', async () => {
    const mockRequest: KYCRequest = {
      userId: 'user-123',
      fullName: 'John Doe',
      idDoc: { buffer: Buffer.from('test'), mimetype: 'image/jpeg' } as Express.Multer.File,
      proofOfAddress: { buffer: Buffer.from('test'), mimetype: 'application/pdf' } as Express.Multer.File,
    };

    const mockResult = {
      status: 'manual_review' as const,
      reason: 'Requires manual review',
      notabeneId: 'nb-456',
      completedAt: new Date(),
    };

    mockGateway.verifyKYC.mockResolvedValue(mockResult);
    mockUserRepo.findOne.mockResolvedValue({ id: 'user-123', kycStatus: 'pending' });
    mockKycRepo.create.mockReturnValue(mockResult);
    mockKycRepo.save.mockResolvedValue(mockResult);

    const result = await service.verifyKYC(mockRequest);

    expect(result).toEqual(mockResult);
    expect(mockUserRepo.save).toHaveBeenCalledWith({ id: 'user-123', kycStatus: 'pending' });
  });

  it('should handle webhook for kyc.completed', async () => {
    const payload = {
      event: 'kyc.completed',
      status: 'approved',
      verificationId: 'nb-456',
      userId: 'user-123',
      reason: 'Approved',
    };

    mockGateway.handleWebhook.mockResolvedValue({
      status: 'approved',
      reason: 'Approved',
      notabeneId: 'nb-456',
      completedAt: new Date(),
    });

    mockUserRepo.findOne.mockResolvedValue({ id: 'user-123', kycStatus: 'pending' });
    mockKycRepo.create.mockReturnValue({});
    mockKycRepo.save.mockResolvedValue({});

    await service.handleWebhook(payload);

    expect(mockGateway.handleWebhook).toHaveBeenCalledWith(payload);
    expect(mockUserRepo.save).toHaveBeenCalledWith({ id: 'user-123', kycStatus: 'approved' });
  });

  it('should throw error on gateway failure', async () => {
    const mockRequest: KYCRequest = {
      userId: 'user-123',
      fullName: 'John Doe',
      idDoc: { buffer: Buffer.from('test'), mimetype: 'image/jpeg' } as Express.Multer.File,
      proofOfAddress: { buffer: Buffer.from('test'), mimetype: 'application/pdf' } as Express.Multer.File,
    };

    mockGateway.verifyKYC.mockRejectedValue(new Error('API Error'));

    await expect(service.verifyKYC(mockRequest)).rejects.toThrow('API Error');
  });
});