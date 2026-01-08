import { Worker } from 'bullmq';
import { prisma } from '../prismaClient';

const connection = { host: process.env.REDIS_HOST, port: 6379 };

// Process jobs from 'attribution-queue'
new Worker('attribution-queue', async (job) => {
  const { installId } = job.data;
  
  const install = await prisma.install.findUnique({ where: { installId } });
  if (!install) return;

  // --- STRATEGY 1: Deterministic (Android Referrer) ---
  // If we have "click_id=..." in the referrer, it's a 100% match.
  if (install.referrer && install.referrer.includes('click_id=')) {
    const match = /click_id=([^&]+)/.exec(install.referrer);
    if (match && match[1]) {
      const clickId = match[1];
      
      // Fetch original campaign details
      const click = await prisma.click.findUnique({ where: { clickId } });
      
      if (click) {
        await prisma.install.update({
          where: { installId },
          data: { 
            attributedTo: click.campaign, 
            attributionType: 'deterministic' 
          }
        });
        console.log(`✅ MATCHED (Deterministic): ${installId} -> ${click.campaign}`);
        return;
      }
    }
  }

  // --- STRATEGY 2: Probabilistic (Fingerprinting) ---
  // Search for clicks from same IP + Device Model within last 2 hours
  const LOOKBACK_WINDOW = 2 * 60 * 60 * 1000; // 2 Hours
  const twoHoursAgo = new Date(Date.now() - LOOKBACK_WINDOW);

  const bestMatch = await prisma.click.findFirst({
    where: {
      ip: install.ip,
      deviceModel: install.deviceModel, // e.g. "Pixel 6" must match
      createdAt: { gte: twoHoursAgo }
    },
    orderBy: { createdAt: 'desc' } // Most recent click wins
  });

  if (bestMatch) {
    await prisma.install.update({
      where: { installId },
      data: { 
        attributedTo: bestMatch.campaign, 
        attributionType: 'probabilistic' 
      }
    });
    console.log(`✅ MATCHED (Probabilistic): ${installId} -> ${bestMatch.campaign}`);
  } else {
    // No match found
    await prisma.install.update({
      where: { installId },
      data: { attributedTo: 'organic', attributionType: 'none' }
    });
    console.log(`❌ ORGANIC: ${installId}`);
  }

}, { connection });