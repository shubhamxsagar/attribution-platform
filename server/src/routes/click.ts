import { Router } from 'express';
import requestIp from 'request-ip';
import useragent from 'useragent';
import { Click } from '../model/Click';

export const clickRoute = Router();

clickRoute.get('/r/:clickId', async (req, res) => {
  try {
    const { clickId } = req.params;
    // Explicitly cast query params to strings
    const campaign = req.query.campaign as string || 'organic';
    const source = req.query.source as string || '';
    const source_id = req.query.source_id as string || '';
    const deep_link = req.query.deep_link as string || '';

    const ip = requestIp.getClientIp(req) || '0.0.0.0';
    const uaString = req.headers['user-agent'] || '';
    const agent = useragent.parse(uaString);

    // Parse OS Version
    const osVersion = agent.os.toString().replace(/_/g, '.').split(' ').pop();

    // Save to MongoDB (Upsert)
    await Click.findOneAndUpdate(
      { clickId },
      {
        clickId,
        campaign,
        source,
        sourceId: source_id,
        deep_link,
        ip,
        ua: uaString,
        deviceModel: agent.device.family,
        osVersion
      },
      { upsert: true, new: true }
    );

    console.log(`[CLICK] Saved ${clickId} - SourceID: ${source_id}`);

    // Redirect Logic
    const isIOS = /iPad|iPhone|iPod/.test(uaString) || (uaString.includes("Mac") && "ontouchend" in req);
    
    if (isIOS) {
      // iOS Redirect
      res.redirect("https://apps.apple.com/us/app/creditsea/id123456789");
    } else {
      // Android Redirect
      const pkg = process.env.PACKAGE_NAME || 'com.creditsea.app';
      
      let rawReferrer = `click_id=${clickId}`;
      if (campaign) rawReferrer += `&campaign=${campaign}`;
      if (source) rawReferrer += `&source=${source}`;
      if (source_id) rawReferrer += `&source_id=${source_id}`;
      if (deep_link) rawReferrer += `&deep_link=${deep_link}`;

      const referrerEncoded = encodeURIComponent(rawReferrer);
      res.redirect(`https://play.google.com/store/apps/details?id=${pkg}&referrer=${referrerEncoded}`);
    }

  } catch (error) {
    console.error(error);
    res.status(500).send("Tracking Error");
  }
});