const fs = require('fs');
const fetch = require('node-fetch');
const file = 'history.json';

async function main() {
  const res = await fetch('https://notpixel.org/api/v1/battle-canvas/info');
  const data = await res.json();
  const now = new Date().toISOString();
  let history = [];
  if (fs.existsSync(file)) {
    history = JSON.parse(fs.readFileSync(file));
  }
  history.push({
    timestamp: now,
    rewardBank: data.rewardBank,
  });
  fs.writeFileSync(file, JSON.stringify(history, null, 2));
  console.log('Saved snapshot at', now);
}
main();
