import { Router } from 'express';
import requestIp from 'request-ip';
import useragent from 'useragent';
import { prisma } from '../prismaClient';

export const clickRoute = Router();

// URL: http://your-domain.com/r/:clickId?campaign=summer
clickRoute.get('/r/:clickId', async (req, res) => {
  try {
    const { clickId } = req.params;
    const { campaign, source, source_id, deep_link } = req.query; 

    const ip = requestIp.getClientIp(req) || '0.0.0.0';
    const uaString = req.headers['user-agent'] || '';
    const agent = useragent.parse(uaString);

    // 1. Save the Click Fingerprint
    await prisma.click.upsert({
      where: { clickId: clickId },
      update: {},
      create: {
        clickId,
        campaign: String(campaign || 'organic'),
        source: String(source || ''),
        sourceId: String(source_id || ''),
        ip: ip,
        ua: uaString,
        deviceModel: agent.device.family
      }
    });

    console.log(`[CLICK] Saved ${clickId} from ${agent.os.family}`);

    // 2. DETECT OS & REDIRECT
    const isIOS = /iPad|iPhone|iPod/.test(uaString) || (uaString.includes("Mac") && "ontouchend" in req);
    const isAndroid = /android/i.test(uaString);

    if (isIOS) {
      // --- iOS REDIRECT ---
      // Apple doesn't support 'referrer', so we just send them to the store.
      // We rely on Fingerprinting (IP + Device) to match them later.
      
      // TODO: Replace with your actual App Store ID
      const appStoreUrl = "https://apps.apple.com/us/app/creditsea/id6743390338";
      res.redirect(appStoreUrl);
    } 
    else {
      // --- ANDROID REDIRECT ---
      // We attach the referrer data for 100% accuracy
      const pkg = process.env.PACKAGE_NAME || 'com.creditsea.app';
      
      // We encode the clickId and campaign into the referrer
       let rawReferrer = `click_id=${clickId}`;
      if (campaign) rawReferrer += `&campaign=${campaign}`;
      if (source) rawReferrer += `&source=${source}`;       // <--- ADDED
      if (source_id) rawReferrer += `&source_id=${source_id}`; // <--- ADDED
      if (deep_link) rawReferrer += `&deep_link=${deep_link}`;

      const referrerEncoded = encodeURIComponent(rawReferrer);
      const playStoreUrl = `https://play.google.com/store/apps/details?id=${pkg}&referrer=${referrerEncoded}`;
      
      res.redirect(playStoreUrl);
    }

  } catch (error) {
    console.error(error);
    res.status(500).send("Tracking Error");
  }
});