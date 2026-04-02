export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { exec } = require('child_process');
  const fs = require('fs');

  if (req.method === 'POST') {
    const s = req.body;
    const env = Object.entries(s).map(([k,v]) => k + '=' + v).join('\n');
    fs.writeFileSync('/root/pumpbot/.env', env);
    exec('pm2 restart pumpbot', (err) => {
      if (err) return res.json({ success: false, error: err.message });
      res.json({ success: true });
    });
  } else {
    try {
      const env = fs.readFileSync('/root/pumpbot/.env', 'utf8');
      const settings = {};
      env.split('\n').forEach(line => {
        const [k, ...v] = line.split('=');
        if (k) settings[k.trim()] = v.join('=').trim();
      });
      res.json(settings);
    } catch { res.json({}); }
  }
}
