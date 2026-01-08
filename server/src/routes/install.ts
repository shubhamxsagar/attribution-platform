import { Router } from 'express';
import { Queue } from 'bullmq';
import requestIp from 'request-ip';
import { prisma } from '../prismaClient';

export const installRoute = Router();

// Connection to Redis for the Queue
const matchQueue = new Queue('attribution-queue', {
  connection: { host: process.env.REDIS_HOST, port: 6379 }
});

installRoute.post('/api/install', async (req, res) => {
  try {
    // 1. Receive signals from Flutter SDK
    const { 
      installId, 
      referrer, 
      deviceModel, 
      ua,
      // Receive new fields
      clickTimestamp,
      installBeginTimestamp,
      isInstantApp
    } = req.body;
    const ip = requestIp.getClientIp(req) || '0.0.0.0';

    let isFraud = false;
    if (clickTimestamp > 0 && installBeginTimestamp > 0) {
      const timeDiff = installBeginTimestamp - clickTimestamp;
      if (timeDiff < 5) { // 5 seconds
        console.log(`🚨 FRAUD DETECTED: Click Injection (TimeDiff: ${timeDiff}s)`);
        isFraud = true;
      }
    }

    // 2. Store the Install "Raw"
    await prisma.install.create({
      data: {
        installId,
        referrer,
        ip,
        ua,
        deviceModel,
        // Save new fields
        clickTimestamp: clickTimestamp ? BigInt(clickTimestamp) : null,
        installBeginTimestamp: installBeginTimestamp ? BigInt(installBeginTimestamp) : null,
        isInstantApp: isInstantApp,
        // If fraud, mark as 'blocked' immediately
        attributionType: isFraud ? 'blocked_fraud' : 'pending'
      }
    });

    if (!isFraud) {
      await matchQueue.add('match-job', { installId });
    }

    console.log(`[INSTALL] Received ${installId}. Queueing for match...`);

    res.json({ success: true });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});