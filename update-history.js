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

  // Tournament Bank
  const tournamentBank = typeof data.rewardBank === 'number' ? data.rewardBank : undefined;

  // Burn Bank: API hoặc fallback
  let burnBank = data.burnBank;
  if (typeof burnBank !== 'number' && typeof tournamentBank === 'number') {
    burnBank = Math.floor(tournamentBank / 2.35);
  }

  // Total Bank: API hoặc fallback
  let totalBank = data.totalBank;
  if (typeof totalBank !== 'number' && typeof tournamentBank === 'number' && typeof burnBank === 'number') {
    totalBank = tournamentBank + burnBank;
  }

  // Live Token Supply: API hoặc fallback
  let liveTokenSupply = data.liveTokenSupply;
  if (typeof liveTokenSupply !== 'number' && typeof burnBank === 'number') {
    liveTokenSupply = 245000000 - burnBank - 100000;
  }

  // Online Players: API hoặc fallback (không có trong API này, để null)
  let onlinePlayers = null;

  // Tournament Trade Volume: API hoặc fallback
  let tournamentTradeVolume = data.tournamentTradeVolume;
  if (typeof tournamentTradeVolume !== 'number' && typeof totalBank === 'number') {
    tournamentTradeVolume = Math.round(totalBank * 5.88);
  }

  history.push({
    timestamp: now,
    rewardBank: tournamentBank,
    burnBank: burnBank,
    totalBank: totalBank,
    liveTokenSupply: liveTokenSupply,
    onlinePlayers: onlinePlayers,
    tournamentTradeVolume: tournamentTradeVolume,
  });
  fs.writeFileSync(file, JSON.stringify(history, null, 2));
  console.log('Saved snapshot at', now);
}
main();
