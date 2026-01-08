import { Router } from 'express';
import requestIp from 'request-ip';
import { matchInstall } from '../services/matcher';
import { Install } from '../model/Install';

export const installRoute = Router();

installRoute.post('/api/install', async (req, res) => {
  try {
    const { 
      installId, referrer, deviceModel, ua, 
      clickTimestamp, installBeginTimestamp, isInstantApp 
    } = req.body;

    const ip = requestIp.getClientIp(req) || '0.0.0.0';

    // 1. Fraud Check (CTIT)
    let isFraud = false;
    if (clickTimestamp > 0 && installBeginTimestamp > 0) {
      const timeDiff = installBeginTimestamp - clickTimestamp;
      if (timeDiff < 5) {
        console.log(`🚨 FRAUD: Click Injection detected (${timeDiff}s)`);
        isFraud = true;
      }
    }

    // 2. Save to MongoDB
    // We use findOneAndUpdate to handle re-sends safely
    const install = await Install.findOneAndUpdate(
      { installId },
      {
        installId,
        referrer,
        ip,
        ua,
        deviceModel,
        clickTimestamp,
        installBeginTimestamp,
        isInstantApp,
        attributionType: isFraud ? 'blocked_fraud' : 'pending'
      },
      { upsert: true, new: true }
    );

    // 3. Run Matching (Directly, no Redis)
    if (!isFraud) {
      // Run in background (don't await) so we reply to app fast
      matchInstall(installId).catch(err => console.error(err));
    }

    // 4. Return result to App
    // If we just ran the match, we might want to wait a split second or just return what we have.
    // For better UX, let's wait for the match result if it's fast.
    
    // Re-fetch to get the result of matchInstall
    const updatedInstall = await Install.findOne({ installId });

    res.json({
      success: true,
      found: updatedInstall?.attributedTo && updatedInstall.attributedTo !== 'organic',
      campaign: updatedInstall?.attributedTo,
      deep_link: "", // You would fetch this from the Click model if needed
      is_reinstall: false
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});