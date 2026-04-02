const { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
const { PumpFunSDK } = require('pumpdotfun-sdk');
const bs58 = require('bs58');
require('dotenv').config();

const connection = new Connection(process.env.RPC_URL, 'confirmed');

async function buyToken(mintAddress, solAmount) {
  try {
    const privateKeyBytes = bs58.default.decode(process.env.PRIVATE_KEY);
    const wallet = Keypair.fromSecretKey(privateKeyBytes);
    const sdk = new PumpFunSDK({ connection });
    const mint = new PublicKey(mintAddress);

    console.log(`[BUY] Buying ${solAmount} SOL of ${mintAddress}`);

    const slippageBps = Math.floor(parseFloat(process.env.SLIPPAGE) * 100);
    const solLamports = BigInt(Math.floor(solAmount * 1e9));

    const result = await sdk.buy(
      wallet,
      mint,
      solLamports,
      BigInt(slippageBps),
      {
        unitLimit: 250000,
        unitPrice: Math.floor(parseFloat(process.env.PRIORITY_FEE) * 1e9),
      }
    );

    if (result.success) {
      console.log(`[BUY] ✅ Success! TX: ${result.signature}`);
      return { success: true, signature: result.signature, mint: mintAddress };
    } else {
      console.log(`[BUY] ❌ Failed: ${result.error}`);
      return { success: false, error: result.error };
    }
  } catch (err) {
    console.error(`[BUY] ❌ Error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { buyToken };
