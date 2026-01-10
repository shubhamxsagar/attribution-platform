import { Router } from 'express';
import requestIp from 'request-ip';
import useragent from 'useragent';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { Click } from '../model/Click';

export const clickRoute = Router();

clickRoute.get('/r/:linkName', async (req, res) => {
  try {
    const { linkName } = req.params;
    const { campaign, source, source_id, deep_link } = req.query;
    const uaString = req.headers['user-agent'] || '';

    // ============================================================
    // 1. DETECT IN-APP BROWSERS
    // ============================================================
    const inAppRules = ['Instagram', 'FBAN', 'FBAV', 'Twitter', 'LinkedIn', 'Snapchat', 'Line'];
    const isInAppBrowser = inAppRules.some(rule => uaString.includes(rule));

    if (isInAppBrowser) {
      const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      
      // Chrome Scheme (Forces Chrome on iOS if installed)
      const chromeUrl = fullUrl.replace("https://", "googlechrome://").replace("http://", "googlechrome://");

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <!-- Smart App Banner: Shows native UI, but we want them to click OUR button for cookies -->
            <meta name="apple-itunes-app" content="app-id=6743390338">
            <title>Open in Browser</title>
            <style>
              body { font-family: -apple-system, sans-serif; text-align: center; padding: 20px; background: #fff; color: #333; }
              .container { max-width: 400px; margin: 0 auto; margin-top: 50px; }
              h2 { font-size: 22px; margin-bottom: 10px; }
              p { color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 30px; }
              
              .btn { 
                display: block; width: 100%; padding: 16px 0; margin-bottom: 15px;
                border-radius: 12px; font-size: 17px; font-weight: 600; text-decoration: none;
                transition: opacity 0.2s;
              }
              .btn-primary { background-color: #007AFF; color: white; }
              .btn-secondary { background-color: #F2F2F7; color: #007AFF; }
              .btn:active { opacity: 0.8; }

              .instructions { 
                margin-top: 40px; padding: 20px; background: #F9F9F9; border-radius: 16px; text-align: left; 
              }
              .step { display: flex; align-items: center; margin-bottom: 15px; font-size: 15px; }
              .icon { font-size: 20px; margin-right: 15px; width: 30px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>Security Check</h2>
              <p>This app's browser does not support secure tracking. Please open in Safari or Chrome to continue.</p>

              <!-- 1. Try to open in Default Browser (Safari) -->
              <!-- target="_blank" is the standard way to ask IABs to open external -->
              <a href="${fullUrl}" target="_blank" class="btn btn-primary">Open System Browser</a>

              <!-- 2. Force Chrome (If they have it) -->
              <a href="${chromeUrl}" class="btn btn-secondary">Open in Chrome</a>

              <div class="instructions">
                <div style="font-weight:600; margin-bottom:15px;">If buttons don't work:</div>
                <div class="step">
                  <span class="icon">1️⃣</span>
                  <span>Tap the <strong>•••</strong> or <strong>Share</strong> icon</span>
                </div>
                <div class="step">
                  <span class="icon">2️⃣</span>
                  <span>Select <strong>Open in Browser</strong></span>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;
      return res.send(html);
    }

    // ============================================================
    // 2. SCREEN CAPTURE (Deepview)
    // ============================================================
    if (!req.query.screen_captured) {
      const html = `
        <html>
          <head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body>
            <script>
              const w = window.screen.width * window.devicePixelRatio;
              const h = window.screen.height * window.devicePixelRatio;
              const screenRes = Math.round(w) + "x" + Math.round(h);
              const url = new URL(window.location.href);
              url.searchParams.set('screen_captured', 'true');
              url.searchParams.set('ss', screenRes); 
              window.location.href = url.toString();
            </script>
          </body>
        </html>
      `;
      return res.send(html);
    }

    // ============================================================
    // 3. GENERATE UNIQUE ID & COOKIE
    // ============================================================
    const uniqueClickId = `${linkName}-${uuidv4().slice(0, 8)}`;

    if (campaign || source || source_id) {
      const cookieData = JSON.stringify({
        campaign,
        source,
        sourceId: source_id,
        clickId: uniqueClickId
      });

      res.cookie('attribution_data', cookieData, {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      });
    }

    // ============================================================
    // 4. SAVE TO DB
    // ============================================================
    const screenSize = req.query.ss as string || '';
    const ip = requestIp.getClientIp(req) || '0.0.0.0';
    const agent = useragent.parse(uaString);
    const osVersion = agent.os.toString().replace(/_/g, '.').split(' ').pop();

    await Click.create({
      clickId: uniqueClickId,
      campaign: String(campaign || linkName),
      source: String(source || ''),
      sourceId: String(source_id || ''),
      deep_link: String(deep_link || ''),
      ip,
      ua: uaString,
      deviceModel: agent.device.family,
      osVersion,
      screenSize
    });

    console.log(`[CLICK] Generated: ${uniqueClickId}`);

    // ============================================================
    // 5. REDIRECT
    // ============================================================
    const isIOS = /iPad|iPhone|iPod/.test(uaString) || (uaString.includes("Mac") && "ontouchend" in req);
    
    if (isIOS) {
      res.redirect("https://apps.apple.com/us/app/creditsea/id6743390338");
    } 
    else {
      const pkg = process.env.PACKAGE_NAME || 'com.creditsea.app';
      let rawReferrer = `click_id=${uniqueClickId}`;
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

clickRoute.get('/sourceTrack', async (req, res) => {
  try {
    const { userId } = req.query;
    const cookieRaw = req.cookies?.attribution_data;
    
    console.log(`🔍 Source Track Hit | User: ${userId}`);

    if (cookieRaw) {
      // --- SCENARIO A: COOKIE FOUND ---
      try {
        const data = JSON.parse(cookieRaw);
        console.log(`✅ ATTRIBUTION SUCCESS: User ${userId} came from Campaign: ${data.campaign}, Source: ${data.source}, Source ID: ${data.sourceId}`);
      } catch (parseError) {
        console.error("⚠️ Cookie Data Corrupt:", parseError);
      }
    } else {
      console.log("⚠️ No Attribution Cookie found. This is likely an Organic user or different browser.");
    }

    res.redirect("creditseaapp://open");

  } catch (err) {
    console.error("Source Track Critical Error:", err);
    res.redirect("creditseaapp://open"); 
  }
});