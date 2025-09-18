import express from 'express';
import { KYCService } from '../services/kyc';
import pool from '../db/index';

const router = express.Router();
const kycService = new KYCService();

/**
 * @swagger
 * /kyc/verify:
 *   post:
 *     summary: Verify KYC for a user using Notabene API
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Unique user identifier
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               address:
 *                 type: string
 *               documentType:
 *                 type: string
 *                 enum: [passport, drivers_license, national_id]
 *               documentNumber:
 *                 type: string
 *     responses:
 *       '200':
 *         description: KYC verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [approved, rejected]
 *                 reason:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       '400':
 *         description: Invalid request data
 *       '500':
 *         description: Internal server error
 */
router.post('/verify', express.json(), async (req, res) => {
  try {
    const { userId, ...userData } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'MISSING_USER_ID',
        message: 'User ID is required'
      });
    }

    // Call KYC service
    const kycResult = await kycService.verifyKYC(userId, userData);

    res.json(kycResult);
  } catch (error) {
    console.error('KYC verification endpoint error:', error);
    res.status(500).json({
      error: 'KYC_VERIFICATION_FAILED',
      message: 'An error occurred during KYC verification'
    });
  }
});

/**
 * @swagger
 * /kyc/status/{userId}:
 *   get:
 *     summary: Get KYC status for a user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique user identifier
 *     responses:
 *       '200':
 *         description: KYC status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                 kycStatus:
 *                   type: string
 *                   enum: [pending, approved, rejected, manual_review]
 *       '404':
 *         description: User not found
 *       '500':
 *         description: Internal server error
 */
router.get('/status/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const userQuery = 'SELECT kyc_status FROM users WHERE id = $1';
    const result = await pool.query(userQuery, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User not found' });
    }

    res.json({ userId, kycStatus: result.rows[0].kyc_status });
  } catch (error) {
    console.error('KYC status endpoint error:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to retrieve KYC status' });
  }
});

export default router;