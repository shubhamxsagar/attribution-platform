import { Router } from 'express';
import requestIp from 'request-ip';
import { matchInstall } from '../services/matcher';
import { Install } from '../model/Install';

export const installRoute = Router();

installRoute.post('/api/install', async (req, res) => {
  try {
    const { 
      installId, 
      referrer, 
      deviceModel, 
      ua, 
      gaid, idfv, androidId,
      osVersion, screenSize, locale, timezone,
      clickTimestamp, installBeginTimestamp, isInstantApp 
    } = req.body;

    const ip = requestIp.getClientIp(req) || '0.0.0.0';

    const install = await Install.findOneAndUpdate(
      { installId },
      {
        installId,
        referrer,
        ip,
        ua,
        deviceModel,
        osVersion,
        screenSize,
        locale,
        timezone,
        gaid,
        idfv,
        androidId,
        clickTimestamp,
        installBeginTimestamp,
        isInstantApp,
        attributionType: 'pending'
      },
      { upsert: true, new: true }
    );

    matchInstall(installId).catch(err => console.error(err));
    const updatedInstall = await Install.findOne({ installId });

    res.json({
      success: true,
      found: updatedInstall?.attributedTo && updatedInstall.attributedTo !== 'organic',
      campaign: updatedInstall?.attributedTo,
      deep_link: "", 
      is_reinstall: false
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});