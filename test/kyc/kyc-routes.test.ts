import request from 'supertest';
import express from 'express';
import kycRouter from '../../src/routes/kyc';
import { KYCService } from '../../src/services/kyc';

// Mock the KYC service
jest.mock('../../src/services/kyc');

const mockKYCService = KYCService as jest.MockedClass<typeof KYCService>;

describe('KYC Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/kyc', kycRouter);
    jest.clearAllMocks();
  });

  describe('POST /api/v1/kyc/verify', () => {
    it('should return KYC result when verification succeeds', async () => {
      const mockResult = {
        status: 'approved' as const,
        reason: 'All checks passed',
        timestamp: new Date(),
      };

      mockKYCService.prototype.verifyKYC = jest.fn().mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/v1/kyc/verify')
        .send({
          userId: 'user123',
          firstName: 'John',
          lastName: 'Doe',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(mockKYCService.prototype.verifyKYC).toHaveBeenCalledWith('user123', {
        firstName: 'John',
        lastName: 'Doe',
      });
    });

    it('should return 400 when userId is missing', async () => {
      const response = await request(app)
        .post('/api/v1/kyc/verify')
        .send({
          firstName: 'John',
          lastName: 'Doe',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('MISSING_USER_ID');
      expect(response.body.message).toBe('User ID is required');
    });

    it('should return 500 when KYC service throws error', async () => {
      mockKYCService.prototype.verifyKYC = jest.fn().mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/api/v1/kyc/verify')
        .send({
          userId: 'user123',
          firstName: 'John',
          lastName: 'Doe',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('KYC_VERIFICATION_FAILED');
      expect(response.body.message).toBe('An error occurred during KYC verification');
    });

    it('should handle rejected KYC status', async () => {
      const mockResult = {
        status: 'rejected' as const,
        reason: 'Document verification failed',
        timestamp: new Date(),
      };

      mockKYCService.prototype.verifyKYC = jest.fn().mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/v1/kyc/verify')
        .send({
          userId: 'user123',
          firstName: 'John',
          lastName: 'Doe',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('rejected');
      expect(response.body.reason).toBe('Document verification failed');
    });
  });
});