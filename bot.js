const { Connection } = require('@solana/web3.js');
const { PumpFunSDK } = require('pumpdotfun-sdk');
const { buyToken } = require('./buy');
const { startMonitor } = require('./monitor');
const axios = require('axios');
require('dotenv').config();

const connection = new Connection(process.env.RPC_URL, 'confirmed');
const boughtTokens = new Set();

async function getTokenData(mintAddress) {
  try {
    const res = await axios.get('https://public-api.birdeye.so/defi/token_overview', {
      headers: { 'X-API-KEY': process.env.BIRDEYE_API_KEY },
      params: { address: mintAddress }
    });
    return res.data?.data || null;
  } catch { return null; }
}

async function checkFilters(mintAddress) {
  const data = await getTokenData(mintAddress);
  if (!data) return false;
  const minAge = parseInt(process.env.MIN_AGE) || 30;
  const minLiq = parseFloat(process.env.MIN_LIQUIDITY) || 5000;
  const minVol = parseFloat(process.env.MIN_VOLUME) || 10000;
  const minTxs = parseInt(process.env.MIN_TXS) || 50;
  const ageSeconds = (Date.now() / 1000) - (data.creationTime || 0);
  if (ageSeconds < minAge) { console.log('[FILTER] Too young:', ageSeconds.toFixed(0) + 's'); return false; }
  if ((data.liquidity || 0) < minLiq) { console.log('[FILTER] Low liquidity'); return false; }
  if ((data.v24hUSD || 0) < minVol) { console.log('[FILTER] Low volume'); return false; }
  if ((data.trade24h || 0) < minTxs) { console.log('[FILTER] Low TXs'); return false; }
  console.log('[FILTER] PASSED:', mintAddress);
  return { passed: true, mc: data.mc || 0, price: data.price || 0 };
}

async function processToken(mintAddress, reason) {
  if (boughtTokens.has(mintAddress)) return;
  const result = await checkFilters(mintAddress);
  if (!result) return;
  boughtTokens.add(mintAddress);
  const solAmount = parseFloat(process.env.SOL_AMOUNT) || 0.1;
  const buyResult = await buyToken(mintAddress, solAmount);
  if (buyResult.success) {
    console.log('[BOT] Bought via:', reason, '| Token:', mintAddress);
    await startMonitor(mintAddress, result.price, result.mc);
  }
}

async function startBot() {
  console.log('[BOT] Starting PumpBot...');
  const sdk = new PumpFunSDK({ connection });
  console.log('[BOT] Listening for new tokens on Pump.fun...');
  sdk.addEventListener('createEvent', async (event) => {
    const mint = event.mint.toString();
    setTimeout(() => processToken(mint, 'Filter'), parseInt(process.env.MIN_AGE) * 1000);
  });
  sdk.addEventListener('tradeEvent', async (event) => {
    const mint = event.mint.toString();
    const trader = event.user.toString();
    const wallets = (process.env.TRACKED_WALLETS || '').split(',').map(w => w.trim());
    const walletNames = (process.env.TRACKED_WALLET_NAMES || '').split(',').map(w => w.trim());
    const idx = wallets.indexOf(trader);
    if (idx !== -1) {
      const name = walletNames[idx] || 'Whale';
      console.log('[BOT] Whale signal:', name, '| Token:', mint);
      processToken(mint, 'Whale: ' + name);
    }
  });
}

module.exports = { startBot };
