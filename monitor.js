const { sellToken } = require('./sell');
require('dotenv').config();

const positions = new Map();

function getTierTimer(mcUsd) {
  if (mcUsd < 10000) return parseInt(process.env.TIER1_TIMER) || 10;
  if (mcUsd < 20000) return parseInt(process.env.TIER2_TIMER) || 15;
  if (mcUsd < 50000) return parseInt(process.env.TIER3_TIMER) || 20;
  return parseInt(process.env.TIER4_TIMER) || 30;
}

async function startMonitor(mintAddress, buyPrice, mcUsd) {
  if (positions.has(mintAddress)) return;
  const timerSecs = getTierTimer(mcUsd);
  const tp = parseFloat(process.env.TAKE_PROFIT) || 80;
  const sl = parseFloat(process.env.STOP_LOSS) || 30;
  console.log('[MONITOR] Watching', mintAddress, '| Timer:', timerSecs + 's');
  const position = { mintAddress, buyPrice, startTime: Date.now(), timerSecs, sold: false };
  positions.set(mintAddress, position);
  const interval = setInterval(async () => {
    const pos = positions.get(mintAddress);
    if (!pos || pos.sold) { clearInterval(interval); return; }
    const elapsed = (Date.now() - pos.startTime) / 1000;
    if (elapsed >= pos.timerSecs) {
      console.log('[MONITOR] Timer expired for', mintAddress);
      clearInterval(interval);
      pos.sold = true;
      await sellToken(mintAddress);
    }
  }, 1000);
  return position;
}

function updatePrice(mintAddress, currentPrice) {
  const pos = positions.get(mintAddress);
  if (!pos || pos.sold) return;
  const tp = parseFloat(process.env.TAKE_PROFIT) || 80;
  const sl = parseFloat(process.env.STOP_LOSS) || 30;
  const change = ((currentPrice - pos.buyPrice) / pos.buyPrice) * 100;
  if (change >= tp) {
    console.log('[MONITOR] TP hit:', change.toFixed(1) + '%');
    pos.sold = true;
    sellToken(mintAddress);
  } else if (change <= -sl) {
    console.log('[MONITOR] SL hit:', change.toFixed(1) + '%');
    pos.sold = true;
    sellToken(mintAddress);
  }
}

function getPositions() { return positions; }

module.exports = { startMonitor, updatePrice, getPositions };
