// src/routes/anreu.ts
import express from 'express';
import multer from 'multer';
import { parseANREUReceipt } from '../anreu/ocr';
import { ethers } from 'ethers';
import CXRT_ABI from '../abi/cxrt.json';
import dotenv from 'dotenv';
import { emitMintInitiated, emitTransferCompleted } from '../events/anreu-events';
import pool from '../db/index';

dotenv.config({ path: '.env.local' });

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * /anreu/upload:
 *   post:
 *     summary: Upload an ANREU PDF or CSV receipt
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       '200':
 *         description: Successfully parsed receipt
 *       '400':
 *         description: Invalid file format or validation error
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'FILE_REQUIRED', message: 'No file uploaded' });
  }

  try {
    const result = await parseANREUReceipt(req.file.buffer, req.file.originalname);

    if (!result.isValid) {
      return res.status(400).json({
        error: 'INVALID_RECEIPT',
        message: 'ANREU receipt failed validation',
        validation: { isValid: false, errors: result.errors }
      });
    }

    res.json({
      uploadId: `upl_${Date.now().toString(36)}`,
      status: 'parsed',
      data: result.data,
      validation: { isValid: true, errors: [] }
    });
  } catch (err) {
    res.status(500).json({ error: 'PARSE_FAILED', message: (err as Error).message });
  }
});

/**
 * @swagger
 * /anreu/confirm-mint:
 *   post:
 *     summary: Confirm the minting of CXRT tokens
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               uploadId:
 *                 type: string
 *               walletAddress:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Successfully initiated minting
 *       '500':
 *         description: Minting failed
 */
router.post('/confirm-mint', express.json(), async (req, res) => {
  const { uploadId, walletAddress, userId } = req.body;

  // 1. Get parsed data from DB (mock for now)
  const mockData = {
    serialRange: "ACCU1000000-ACCU1000999",
    quantity: 1000,
    vintage: 2024,
    projectId: "ACCU-MOCK-001",
    facilityId: "FAC-MOCK-001"
  };

  // 2. Check KYC status
  const userQuery = 'SELECT kyc_status FROM users WHERE id = $1';
  const userResult = await pool.query(userQuery, [userId]);
  if (userResult.rows.length === 0) {
    return res.status(400).json({ error: 'USER_NOT_FOUND', message: 'User not found' });
  }
  if (userResult.rows[0].kyc_status !== 'approved') {
    return res.status(403).json({ error: 'KYC_NOT_APPROVED', message: 'KYC approval required for minting' });
  }

  // 3. Connect to contract
  const provider = new ethers.JsonRpcProvider(process.env.HARDHAT_NODE_URL);
  const wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY!, provider);
  const cxrt = new ethers.Contract("0x7a16fF8270133F063aAb6C9977183D9e72835428", CXRT_ABI, wallet);

  // 4. Call mint
  try {
    const tx = await cxrt.mint(
      walletAddress,
      mockData.quantity,
      mockData.projectId,
      mockData.vintage,
      "Soil Carbon",
      "-33.8688,151.2093"
    );

    // 4. Wait for receipt
    const receipt = await tx.wait();

    // 5. Insert into DB
    const reserveId = `res_${Date.now().toString(36)}`;
    // INSERT INTO reserve_allocations (...) VALUES (...)

    emitMintInitiated(reserveId, receipt.hash, walletAddress);

    res.json({
      txHash: receipt.hash,
      reserveId,
      status: 'mint_pending'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'MINT_FAILED', message: (error as Error).message });
  }
});

/**
 * @swagger
 * /anreu/initiate-transfer:
 *   post:
 *     summary: Initiate a mock ANREU transfer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reserveId:
 *                 type: string
 *               quantity:
 *                 type: number
 *               destinationANREUAccount:
 *                 type: string
 *               otpCode:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       '202':
 *         description: Successfully initiated transfer
 *       '401':
 *         description: Invalid OTP code
 */
router.post('/initiate-transfer', express.json(), async (req, res) => {
  const { reserveId, quantity, destinationANREUAccount, otpCode, userId } = req.body;

  if (otpCode !== "123456") {
    return res.status(401).json({ error: 'INVALID_OTP', message: 'Invalid 2FA code' });
  }

  const transferId = `trf_${Date.now().toString(36)}`;

  // INSERT INTO anreu_transfers (...) VALUES (...)

  // Simulate background job
  setTimeout(() => {
    // UPDATE anreu_transfers SET status='completed', completed_at=NOW() WHERE id=$1
    emitTransferCompleted(transferId, reserveId, ["ACCU1000000"]);
  }, 5000);

  res.status(202).json({
    transferId,
    status: 'pending_anreu_ops',
    estimatedCompletion: new Date(Date.now() + 300000).toISOString() // 5 min
  });
});

export default router;
