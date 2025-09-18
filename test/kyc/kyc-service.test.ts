import { KYCService } from '../../src/services/kyc';
import pool from '../../src/db/index';

// Mock the database pool
jest.mock('../../src/db/index', () => ({
  query: jest.fn(),
}));

// Mock fetch for Notabene API
global.fetch = jest.fn();

describe('KYCService', () => {
  let kycService: KYCService;
  const mockPool = pool as jest.Mocked<typeof pool>;

  beforeEach(() => {
    kycService = new KYCService();
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('verifyKYC', () => {
    it('should return approved status when Notabene API approves', async () => {
      const mockApiResponse = {
        status: 'approved',
        reason: 'All checks passed',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse),
      });

      mockPool.query.mockResolvedValueOnce({});

      const result = await kycService.verifyKYC('user123', {
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.status).toBe('approved');
      expect(result.reason).toBe('All checks passed');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO kyc_results'),
        expect.any(Array)
      );
    });

    it('should return rejected status when Notabene API rejects', async () => {
      const mockApiResponse = {
        status: 'rejected',
        reason: 'Document verification failed',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse),
      });

      mockPool.query.mockResolvedValueOnce({});

      const result = await kycService.verifyKYC('user123', {
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.status).toBe('rejected');
      expect(result.reason).toBe('Document verification failed');
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      mockPool.query.mockResolvedValueOnce({});

      const result = await kycService.verifyKYC('user123', {
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.status).toBe('rejected');
      expect(result.reason).toContain('KYC verification failed');
    });

    it('should handle HTTP errors from Notabene API', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      mockPool.query.mockResolvedValueOnce({});

      const result = await kycService.verifyKYC('user123', {
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.status).toBe('rejected');
      expect(result.reason).toContain('Notabene API error');
    });
  });

  describe('getLatestKYCResult', () => {
    it('should return the latest KYC result for a user', async () => {
      const mockDbResult = {
        rows: [
          {
            status: 'approved',
            reason: 'All checks passed',
            timestamp: new Date('2024-01-01'),
          },
        ],
      };

      mockPool.query.mockResolvedValueOnce(mockDbResult);

      const result = await kycService.getLatestKYCResult('user123');

      expect(result).toEqual({
        status: 'approved',
        reason: 'All checks passed',
        timestamp: new Date('2024-01-01'),
      });
    });

    it('should return null when no KYC result exists', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await kycService.getLatestKYCResult('user123');

      expect(result).toBeNull();
    });

    it('should throw error when database query fails', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(kycService.getLatestKYCResult('user123')).rejects.toThrow('Database error');
    });
  });
});