import request from 'supertest';
import express from 'express';
import anreuRouter from '../../src/routes/anreu';
import * as fs from 'fs';
import * as path from 'path';

const app = express();
app.use('/api/v1/anreu', anreuRouter);

describe('ANREU Lifecycle E2E Test', () => {
  let uploadId: string;
  let reserveId: string;

  it('should upload a valid PDF and return parsed data', async () => {
    const filePath = path.join(__dirname, '../../../test-data/valid_anreu.pdf');
    const response = await request(app)
      .post('/api/v1/anreu/upload')
      .attach('file', filePath);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('parsed');
    expect(response.body.data.serialRange).toBe('ACCU1000000-ACCU1000999');
    uploadId = response.body.uploadId;
  });

  it('should confirm mint and return a transaction hash', async () => {
    const response = await request(app)
      .post('/api/v1/anreu/confirm-mint')
      .send({
        uploadId,
        walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Hardhat test wallet
        userId: 'usr_test'
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('mint_pending');
    expect(response.body.txHash).toMatch(/^0x/);
    reserveId = response.body.reserveId;
  });

  it('should initiate a transfer and return a transfer ID', (done) => {
    request(app)
      .post('/api/v1/anreu/initiate-transfer')
      .send({
        reserveId,
        quantity: 500,
        destinationANREUAccount: 'CER-CLIENT-992837',
        otpCode: '123456',
        userId: 'usr_test'
      })
      .expect(202)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.status).toBe('pending_anreu_ops');
        expect(res.body.transferId).toMatch(/^trf_/);
        
        // Wait for the simulated background job to complete
        setTimeout(() => {
          // In a real-world test, you would check the DB here
          // For this simulation, we just ensure the test completes
          done();
        }, 6000);
      });
  });
});
