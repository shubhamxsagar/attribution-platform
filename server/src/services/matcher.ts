import { Click } from "../model/Click";
import { Install } from "../model/Install";


export const matchInstall = async (installId: string) => {
  console.log(`🔍 Running Matcher for: ${installId}`);

  const install = await Install.findOne({ installId });
  if (!install) return;

  // --- STRATEGY 1: Deterministic (Referrer) ---
  // Check if referrer contains "click_id=..."
  if (install.referrer && install.referrer.includes('click_id=')) {
    const match = /click_id=([^&]+)/.exec(install.referrer);
    if (match && match[1]) {
      const clickId = match[1];
      const click = await Click.findOne({ clickId });

      if (click) {
        install.attributedTo = click.campaign;
        install.sourceId = click.sourceId; // Copy sourceId
        install.attributionType = 'deterministic';
        await install.save();
        console.log(`✅ MATCHED (Deterministic): ${click.campaign}`);
        return;
      }
    }
  }

  // --- STRATEGY 2: Probabilistic (Fingerprint) ---
  // Look back 24 hours
  const lookback = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Find candidates with same IP
  const candidates = await Click.find({
    ip: install.ip,
    createdAt: { $gte: lookback }
  }).sort({ createdAt: -1 });

  let bestMatch = null;
  let highestScore = 0;

  for (const click of candidates) {
    let score = 0;
    score += 50; // IP Match base score

    // Device Model Match
    if (click.deviceModel === install.deviceModel) score += 30;

    // OS Version Match (Simple check)
    if (click.osVersion && install.osVersion && 
        click.osVersion.split('.')[0] === install.osVersion.split('.')[0]) {
      score += 10;
    }

    // Time Decay (Recent is better)
    const hoursDiff = (Date.now() - click.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursDiff < 1) score += 10;

    if (score >= 70 && score > highestScore) {
      highestScore = score;
      bestMatch = click;
    }
  }

  if (bestMatch) {
    install.attributedTo = bestMatch.campaign;
    install.sourceId = bestMatch.sourceId; // Copy sourceId
    install.attributionType = 'probabilistic';
    await install.save();
    console.log(`✅ MATCHED (Probabilistic): ${bestMatch.campaign}`);
  } else {
    install.attributedTo = 'organic';
    install.attributionType = 'none';
    await install.save();
    console.log(`❌ ORGANIC (No match found)`);
  }
};