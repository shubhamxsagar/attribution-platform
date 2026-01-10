import { Click } from "../model/Click";
import { Install } from "../model/Install";

export const matchInstall = async (installId: string) => {
  const install = await Install.findOne({ installId });
  if (!install) return;

  // 1. REFERRER (Android - 100%)
  if (install.referrer && install.referrer.includes('click_id=')) {
    const match = /click_id=([^&]+)/.exec(install.referrer);
    if (match && match[1]) {
      const click = await Click.findOne({ clickId: match[1] });
      if (click) {
        await saveMatch(install, click, 'referrer');
        return;
      }
    }
  }

  // 2. IDENTITY (GAID / IDFV - 100%)
  // Requires you to store GAID/IDFV in Click model too (if available)
  if (install.gaid || install.idfv) {
    const identityMatch = await Click.findOne({
      $or: [
        { gaid: install.gaid }, 
        { idfv: install.idfv }
      ]
    }).sort({ createdAt: -1 });

    if (identityMatch) {
      await saveMatch(install, identityMatch, 'identity');
      return;
    }
  }

  // 3. FINGERPRINTING (iOS/Organic - 90%)
  const lookback = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const candidates = await Click.find({
    ip: install.ip,
    createdAt: { $gte: lookback }
  }).sort({ createdAt: -1 });

  let bestMatch = null;
  let highestScore = 0;

  for (const click of candidates) {
    let score = 0;
    score += 50; // IP Match

    if (click.deviceModel === install.deviceModel) score += 20;
    if (click.screenSize === install.screenSize) score += 15;
    if (click.osVersion && install.osVersion && 
        click.osVersion.split('.')[0] === install.osVersion.split('.')[0]) {
      score += 10;
    }
    if (click.locale === install.locale) score += 5;

    if (score >= 80 && score > highestScore) {
      highestScore = score;
      bestMatch = click;
    }
  }

  if (bestMatch) {
    await saveMatch(install, bestMatch, 'probabilistic');
  } else {
    install.attributedTo = 'organic';
    install.attributionType = 'none';
    await install.save();
  }
};

async function saveMatch(install: any, click: any, type: string) {
  install.attributedTo = click.campaign;
  install.sourceId = click.sourceId;
  install.attributionType = type;
  await install.save();
  console.log(`✅ MATCHED (${type}): ${click.campaign}`);
}