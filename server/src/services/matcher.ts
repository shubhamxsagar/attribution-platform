import { Click } from "../model/Click";
import { Install } from "../model/Install";


export const matchInstall = async (installId: string) => {
  const install = await Install.findOne({ installId });
  if (!install) return;
  console.log(`🕵️ Starting Fingerprint Match for ${install.ip}`);

  const lookback = new Date(Date.now() - 2 * 60 * 60 * 1000); 

  const candidates = await Click.find({
    ip: install.ip,
    createdAt: { $gte: lookback }
  }).sort({ createdAt: -1 });

  const potentialMatches = candidates.filter(click => {
    let score = 0;
    if (click.deviceModel === install.deviceModel) score += 30;
    if (click.screenSize === install.screenSize) score += 20;
    if (click.osVersion && install.osVersion && 
        click.osVersion.split('.')[0] === install.osVersion.split('.')[0]) {
      score += 10;
    }
    return score >= 60; 
  });

  if (potentialMatches.length > 1) {
    console.log(`⚠️ COLLISION DETECTED: Found ${potentialMatches.length} users with same fingerprint. Marking Organic.`);

    install.attributedTo = 'organic';
    install.attributionType = 'collision_blocked';
    await install.save();
    return;
  }

  if (potentialMatches.length === 1) {
    const bestMatch = potentialMatches[0];
    await saveMatch(install, bestMatch, 'probabilistic');
  } else {
    install.attributedTo = 'organic';
    install.attributionType = 'none';
    await install.save();
    console.log(`❌ ORGANIC (No match found)`);
  }
};

async function saveMatch(install: any, click: any, type: string) {
  install.attributedTo = click.campaign;
  install.sourceId = click.sourceId;
  install.attributionType = type;
  await install.save();
  console.log(`✅ MATCHED via ${type.toUpperCase()}: ${click.campaign}`);
}