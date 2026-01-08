import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const connection = { host: process.env.REDIS_HOST, port: 6379 };

export const matchWorker = new Worker('attribution-queue', async (job) => {
  const { installId } = job.data;
  console.log(`[Worker] Processing Install: ${installId}`);

  const install = await prisma.install.findUnique({ where: { installId } });
  if (!install) return;

  // 1. DETERMINISTIC: Check Google Play Referrer
  // Referrer looks like: "click_id=uuid-123&campaign=summer"
  if (install.referrer && install.referrer.includes('click_id=')) {
    const match = /click_id=([^&]+)/.exec(install.referrer);
    if (match && match[1]) {
      const clickId = match[1];
      const click = await prisma.click.findUnique({ where: { clickId } });
      
      if (click) {
        await prisma.install.update({
          where: { installId },
          data: { attributedTo: click.campaign, attributionType: 'deterministic' }
        });
        console.log(`[Worker] Match found (Deterministic): ${click.campaign}`);
        return;
      }
    }
  }

  // 2. PROBABILISTIC: IP + Device Model + 2 Hour Window
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  
  const potentialClick = await prisma.click.findFirst({
    where: {
      ip: install.ip,
      deviceModel: install.deviceModel, // Must be exact match
      createdAt: { gte: twoHoursAgo }
    },
    orderBy: { createdAt: 'desc' } // Get most recent
  });

  if (potentialClick) {
    await prisma.install.update({
      where: { installId },
      data: { attributedTo: potentialClick.campaign, attributionType: 'probabilistic' }
    });
    console.log(`[Worker] Match found (Probabilistic): ${potentialClick.campaign}`);
  } else {
    await prisma.install.update({
      where: { installId },
      data: { attributedTo: 'organic', attributionType: 'none' }
    });
    console.log(`[Worker] No match. Marked Organic.`);
  }

}, { connection });