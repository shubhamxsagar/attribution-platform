import { Router } from 'express';
import requestIp from 'request-ip';
import useragent from 'useragent';
import { prisma } from '../prismaClient';

export const clickRoute = Router();

// URL: http://server.com/r/:clickId?campaign=summer
clickRoute.get('/r/:clickId', async (req, res) => {
  try {
    const { clickId } = req.params;
    const { campaign, source } = req.query;

    const ip = requestIp.getClientIp(req) || '0.0.0.0';
    const agent = useragent.parse(req.headers['user-agent']);

    // 1. Save the Fingerprint
    await prisma.click.upsert({
      where: { clickId: clickId },
      // If it exists, do nothing (empty update)
      update: {},
      // If it's new, create it
      create: {
        clickId,
        campaign: String(campaign || ''),
        source: String(source || ''),
        ip: ip,
        ua: agent.source,
        deviceModel: agent.device.family
      }
    });

    console.log(`[CLICK] Saved click ${clickId} from IP ${ip}`);

    // 2. Build Play Store URL (Deterministic Tracking)
    // We encode our data into the 'referrer' param of the Play Store URL
    const pkg = process.env.PACKAGE_NAME || 'com.creditsea.app';
    const referrerData = encodeURIComponent(`click_id=${clickId}&campaign=${campaign}`);
    const storeUrl = `https://play.google.com/store/apps/details?id=${pkg}&referrer=${referrerData}`;

    // 3. Redirect User
    res.redirect(storeUrl);

  } catch (error) {
    console.error(error);
    res.status(500).send("Tracking Error");
  }
});