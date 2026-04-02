require('dotenv').config();
const { startBot } = require('./bot');

console.log('=================================');
console.log('   PUMPBOT Starting...');
console.log('=================================');
console.log('RPC:', process.env.RPC_URL ? 'Connected' : 'Missing');
console.log('SOL per trade:', process.env.SOL_AMOUNT);
console.log('Slippage:', process.env.SLIPPAGE + '%');
console.log('TP:', process.env.TAKE_PROFIT + '%');
console.log('SL:', process.env.STOP_LOSS + '%');
console.log('Min Age:', process.env.MIN_AGE + 's');
console.log('=================================');

startBot().catch(console.error);
