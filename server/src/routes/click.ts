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
    
    const uniqueClickId = `${linkName}-${uuidv4().slice(0, 8)}`;

    const inAppRules = ['Instagram', 'FBAN', 'FBAV', 'Twitter', 'LinkedIn', 'Snapchat'];
    const isInAppBrowser = inAppRules.some(rule => uaString.includes(rule));

    if (isInAppBrowser) {
      const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      const html = `
        <html>
          <head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="text-align:center; padding:40px; font-family:sans-serif;">
            <h2>Security Check</h2>
            <p>Please open in Safari/Chrome to continue.</p>
            <a href="${fullUrl}" target="_blank" style="background:#007AFF;color:white;padding:15px 30px;border-radius:10px;text-decoration:none;display:block;">Open Browser</a>
          </body>
        </html>
      `;
      return res.send(html);
    }

    if (!req.query.screen_captured) {
      const html = `
        <html>
          <head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body>
            <script>
              // 1. Capture Screen
              const w = window.screen.width * window.devicePixelRatio;
              const h = window.screen.height * window.devicePixelRatio;
              const screenRes = Math.round(w) + "x" + Math.round(h);
              
              // 2. Copy ID to Clipboard (iOS Hack)
              // We try to copy "creditsea_ref:UNIQUE_ID"
              const clickId = "${uniqueClickId}";
              navigator.clipboard.writeText("creditsea_ref:" + clickId).catch(e => {});

              // 3. Redirect
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

    if (campaign || source) {
      res.cookie('attribution_data', JSON.stringify({ campaign, source, sourceId: source_id, clickId: uniqueClickId }), {
        maxAge: 604800000, httpOnly: true, secure: true, sameSite: 'none'
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
      ip, ua: uaString, deviceModel: agent.device.family, osVersion, screenSize
    });

    const isIOS = /iPad|iPhone|iPod/.test(uaString) || (uaString.includes("Mac") && "ontouchend" in req);
    if (isIOS) {
      res.redirect("https://apps.apple.com/us/app/creditsea/id6743390338");
    } else {
      const pkg = process.env.PACKAGE_NAME || 'com.creditsea.app';
      const rawReferrer = `click_id=${uniqueClickId}&campaign=${campaign}&source=${source}&source_id=${source_id}`;
      res.redirect(`https://play.google.com/store/apps/details?id=${pkg}&referrer=${encodeURIComponent(rawReferrer)}`);
    }
  } catch (error) { res.status(500).send("Error"); }
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