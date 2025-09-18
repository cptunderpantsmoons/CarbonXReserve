import { Request, Response, NextFunction } from 'express';
import { KYCService } from '../services/kyc';

const kycService = new KYCService();

export const isKYCApproved = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Assume userId is available in req.user or req.body.userId
    const userId = (req as any).user?.userId || req.body.userId || req.query.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'USER_ID_MISSING',
        message: 'User ID is required for KYC check'
      });
    }

    // Get the latest KYC result
    const latestKYC = await kycService.getLatestKYCResult(userId);

    if (!latestKYC) {
      return res.status(403).json({
        error: 'KYC_NOT_FOUND',
        message: 'No KYC verification found for this user'
      });
    }

    if (latestKYC.status !== 'approved') {
      return res.status(403).json({
        error: 'KYC_REJECTED',
        message: 'KYC verification is required to access this resource',
        kycStatus: latestKYC.status,
        reason: latestKYC.reason
      });
    }

    // KYC approved, proceed
    next();
  } catch (error) {
    console.error('KYC middleware error:', error);
    res.status(500).json({
      error: 'KYC_CHECK_FAILED',
      message: 'An error occurred while checking KYC status'
    });
  }
};