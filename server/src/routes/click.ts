import { Router } from 'express';
import requestIp from 'request-ip';
import useragent from 'useragent';
import { Click } from '../model/Click';

export const clickRoute = Router();

clickRoute.get('/r/:clickId', async (req, res) => {
  try {
    const { clickId } = req.params;
    const { campaign, source, source_id, deep_link } = req.query;
    
    // 1. CHECK IF SCREEN CAPTURED
    // If 'screen_captured' is missing, we pause and serve the HTML helper first.
    // This applies to BOTH Android and iOS now.
    if (!req.query.screen_captured) {
      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Redirecting...</title>
          </head>
          <body style="background-color: #fff;">
            <script>
              // Capture Screen Resolution & Density
              const w = window.screen.width * window.devicePixelRatio;
              const h = window.screen.height * window.devicePixelRatio;
              const screenRes = Math.round(w) + "x" + Math.round(h);
              
              // Construct new URL with data
              const url = new URL(window.location.href);
              url.searchParams.set('screen_captured', 'true');
              url.searchParams.set('ss', screenRes); 
              
              // Redirect back to self
              window.location.href = url.toString();
            </script>
          </body>
        </html>
      `;
      return res.send(html);
    }

    // --- IF WE ARE HERE, WE HAVE THE DATA ---

    const screenSize = req.query.ss as string || '';
    const ip = requestIp.getClientIp(req) || '0.0.0.0';
    const uaString = req.headers['user-agent'] || '';
    const agent = useragent.parse(uaString);
    const osVersion = agent.os.toString().replace(/_/g, '.').split(' ').pop();

    // 2. SAVE CLICK TO DB
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
        osVersion,
        screenSize // Saved for Android and iOS
      },
      { upsert: true, new: true }
    );

    console.log(`[CLICK] Saved ${clickId} | IP: ${ip} | Screen: ${screenSize} | OS: ${agent.os.family}`);

    // 3. FINAL REDIRECT
    const isIOS = /iPad|iPhone|iPod/.test(uaString) || (uaString.includes("Mac") && "ontouchend" in req);
    
    if (isIOS) {
      // iOS Redirect
      res.redirect("https://apps.apple.com/us/app/creditsea/id6743390338");
    } 
    else {
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