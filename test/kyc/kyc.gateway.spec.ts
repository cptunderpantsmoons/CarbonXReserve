import { Test, TestingModule } from '@nestjs/testing';
import { KycGateway } from '../../src/kyc.gateway';
import { KYCRequest } from '../../src/types/kyc';

// Mock the Notabene client
jest.mock('@notabene/client', () => ({
  NotabeneClient: jest.fn().mockImplementation(() => ({
    uploadDocuments: jest.fn(),
    startVerification: jest.fn(),
    getVerificationStatus: jest.fn(),
  })),
}));

describe('KycGateway', () => {
  let gateway: KycGateway;
  let mockClient: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KycGateway],
    }).compile();

    gateway = module.get<KycGateway>(KycGateway);

    // Access the private client for mocking
    mockClient = (gateway as any).client;
  });

  it('should verify KYC and return approved result', async () => {
    const mockRequest: KYCRequest = {
      userId: 'user-123',
      fullName: 'John Doe',
      idDoc: { buffer: Buffer.from('test') } as Express.Multer.File,
      proofOfAddress: { buffer: Buffer.from('test') } as Express.Multer.File,
    };

    mockClient.uploadDocuments.mockResolvedValue({ verificationId: 'nb-456' });
    mockClient.startVerification.mockResolvedValue('nb-456');
    mockClient.getVerificationStatus.mockResolvedValue({
      status: 'approved',
      reason: 'Verification successful',
    });

    const result = await gateway.verifyKYC(mockRequest);

    expect(result.status).toBe('approved');
    expect(result.notabeneId).toBe('nb-456');
    expect(mockClient.uploadDocuments).toHaveBeenCalledWith({
      userId: 'user-123',
      fullName: 'John Doe',
      documents: [mockRequest.idDoc, mockRequest.proofOfAddress],
    });
    expect(mockClient.startVerification).toHaveBeenCalledWith('nb-456');
  });

  it('should verify KYC and return manual_review result', async () => {
    const mockRequest: KYCRequest = {
      userId: 'user-123',
      fullName: 'John Doe',
      idDoc: { buffer: Buffer.from('test') } as Express.Multer.File,
      proofOfAddress: { buffer: Buffer.from('test') } as Express.Multer.File,
    };

    mockClient.uploadDocuments.mockResolvedValue({ verificationId: 'nb-456' });
    mockClient.startVerification.mockResolvedValue('nb-456');
    mockClient.getVerificationStatus.mockResolvedValue({
      status: 'manual_review',
      reason: 'Requires manual review',
    });

    const result = await gateway.verifyKYC(mockRequest);

    expect(result.status).toBe('manual_review');
    expect(result.reason).toBe('Requires manual review');
  });

  it('should handle webhook for kyc.completed', async () => {
    const payload = {
      event: 'kyc.completed',
      status: 'approved',
      verificationId: 'nb-456',
      reason: 'Approved',
    };

    mockClient.getVerificationStatus.mockResolvedValue({
      status: 'approved',
      reason: 'Approved',
    });

    const result = await gateway.handleWebhook(payload);

    expect(result).toEqual({
      status: 'approved',
      reason: 'Approved',
      notabeneId: 'nb-456',
      completedAt: expect.any(Date),
    });
  });

  it('should throw error on upload failure', async () => {
    const mockRequest: KYCRequest = {
      userId: 'user-123',
      fullName: 'John Doe',
      idDoc: { buffer: Buffer.from('test') } as Express.Multer.File,
      proofOfAddress: { buffer: Buffer.from('test') } as Express.Multer.File,
    };

    mockClient.uploadDocuments.mockRejectedValue(new Error('Upload failed'));

    await expect(gateway.verifyKYC(mockRequest)).rejects.toThrow('Upload failed');
  });

  it('should timeout after max attempts', async () => {
    const mockRequest: KYCRequest = {
      userId: 'user-123',
      fullName: 'John Doe',
      idDoc: { buffer: Buffer.from('test') } as Express.Multer.File,
      proofOfAddress: { buffer: Buffer.from('test') } as Express.Multer.File,
    };

    mockClient.uploadDocuments.mockResolvedValue({ verificationId: 'nb-456' });
    mockClient.startVerification.mockResolvedValue('nb-456');
    mockClient.getVerificationStatus.mockResolvedValue({ status: 'pending' }); // Always pending

    await expect(gateway.verifyKYC(mockRequest)).rejects.toThrow('KYC verification timeout');
  });
});