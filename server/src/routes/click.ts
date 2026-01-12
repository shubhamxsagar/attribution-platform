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

    const inAppRules = ['Instagram', 'FBAN', 'FBAV', 'Twitter', 'LinkedIn', 'Snapchat', 'Line'];
    const isInAppBrowser = inAppRules.some(rule => uaString.includes(rule));

    // if (isInAppBrowser) {
    //   const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}&confirmed=true`;

    //   // SERVE A BEAUTIFUL LANDING PAGE (Like Slice/Firebase)
    //   const html = `
    //     <!DOCTYPE html>
    //     <html>
    //       <head>
    //         <meta name="viewport" content="width=device-width, initial-scale=1.0">
    //         <title>CreditSea</title>
    //         <style>
    //           body { font-family: -apple-system, sans-serif; text-align: center; padding: 0; margin: 0; background: #fff; }
    //           .hero { background: #f5f5f7; padding: 60px 20px; }
    //           .logo { font-size: 40px; margin-bottom: 10px; }
    //           h1 { margin: 0; font-size: 24px; color: #1d1d1f; }
    //           p { color: #86868b; font-size: 16px; margin-top: 10px; }
              
    //           .btn { 
    //             background: #007AFF; color: white; padding: 18px 40px; border-radius: 30px; 
    //             text-decoration: none; font-weight: 600; font-size: 18px; display: inline-block;
    //             margin-top: 30px; box-shadow: 0 4px 15px rgba(0,122,255,0.4);
    //           }
              
    //           .footer { margin-top: 50px; font-size: 12px; color: #ccc; }
    //         </style>
    //       </head>
    //       <body>
    //         <div class="hero">
    //           <div class="logo">🌊</div>
    //           <h1>CreditSea</h1>
    //           <p>Instant Personal Loans</p>
              
    //           <!-- 
    //              When they click this, it reloads this same route with &confirmed=true.
    //              This allows us to capture the IP/Fingerprint right before the App Store.
    //           -->
    //           <a href="${fullUrl}" class="btn">Download App</a>
    //         </div>
            
    //         <div class="footer">Secure • Fast • Reliable</div>
    //       </body>
    //     </html>
    //   `;
    //   return res.send(html);
    // }

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