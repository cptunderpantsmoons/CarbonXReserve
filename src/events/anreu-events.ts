// src/events/anreu-events.ts
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const redis = new Redis(process.env.REDIS_URL!);

export function emitMintInitiated(reserveId: string, txHash: string, walletAddress: string) {
  redis.publish('anreu_events', JSON.stringify({
    event: 'anreu.mint.initiated',
    reserveId,
    txHash,
    walletAddress,
    timestamp: new Date().toISOString()
  }));
}

export function emitTransferCompleted(transferId: string, reserveId: string, accuSerials: string[]) {
  redis.publish('anreu_events', JSON.stringify({
    event: 'anreu.transfer.completed',
    transferId,
    reserveId,
    accuSerials,
    timestamp: new Date().toISOString()
  }));
}
