const { Connection, Keypair, PublicKey, VersionedTransaction } = require('@solana/web3.js');
const { getAssociatedTokenAddress, getAccount } = require('@solana/spl-token');
const bs58 = require('bs58');
const axios = require('axios');
require('dotenv').config();

const connection = new Connection(process.env.RPC_URL, 'confirmed');

async function getTokenBalance(walletPubkey, mintAddress) {
  try {
    const mint = new PublicKey(mintAddress);
    const wallet = new PublicKey(walletPubkey);
    const ata = await getAssociatedTokenAddress(mint, wallet);
    const account = await getAccount(connection, ata);
    return Number(account.amount);
  } catch { return 0; }
}

async function sellToken(mintAddress) {
  try {
    const privateKeyBytes = bs58.default.decode(process.env.PRIVATE_KEY);
    const wallet = Keypair.fromSecretKey(privateKeyBytes);
    const slippageBps = Math.floor(parseFloat(process.env.SLIPPAGE) * 100);
    const balance = await getTokenBalance(wallet.publicKey.toString(), mintAddress);
    if (balance === 0) return { success: false, error: 'No balance' };
    console.log('[SELL] Balance:', balance);
    const quoteRes = await axios.get('https://quote-api.jup.ag/v6/quote', {
      params: { inputMint: mintAddress, outputMint: 'So11111111111111111111111111111111111111112', amount: balance, slippageBps }
    });
    const swapRes = await axios.post('https://quote-api.jup.ag/v6/swap', {
      quoteResponse: quoteRes.data,
      userPublicKey: wallet.publicKey.toString(),
      wrapAndUnwrapSol: true,
      prioritizationFeeLamports: Math.floor(parseFloat(process.env.PRIORITY_FEE) * 1e9)
    });
    const tx = VersionedTransaction.deserialize(Buffer.from(swapRes.data.swapTransaction, 'base64'));
    tx.sign([wallet]);
    const sig = await connection.sendTransaction(tx, { maxRetries: 3 });
    await connection.confirmTransaction(sig, 'confirmed');
    console.log('[SELL] Success! TX:', sig);
    return { success: true, signature: sig };
  } catch (err) {
    console.error('[SELL] Error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sellToken };
