// Cấu hình các API endpoint
const API_URLS = {
  info: 'https://notpixel.org/api/v1/battle-canvas/info',
  filter: 'https://notpixel.org/api/v1/battle-canvas/pixels/filter-info',
  online: 'https://notpixel.org/api/v1/history/online/stats',
};

// --- BIẾN TOÀN CỤC ---
let historyData = [];
window.tournamentChartInstanceRef = { current: null };
window.liveTokenChartInstanceRef = { current: null };
window.onlinePlayersChartInstanceRef = { current: null };
window.tradeVolumeChartInstanceRef = { current: null };
window.pxRemainChartInstanceRef = { current: null };
let prevRowValues = null;

const PX_API_URL = 'https://tonapi.io/v2/nfts/collections/EQDxPnc-hOZTW5pxFFt56pny-W3UuEs7ktzf-tAGNCkxtOl1';
const PX_TOTAL = 1048576;

// Hàm để định dạng số cho dễ đọc (ví dụ: 1,000,000)
function formatNumber(num) {
  if (typeof num !== 'number' || isNaN(num)) return 'Not Available';
  return num.toLocaleString('en-US');
}

// Hàm chính để lấy và cập nhật dữ liệu từ API (mỗi 10s)
async function fetchDataAndUpdate() {
  const updateStatusEl = document.getElementById('update-status');
  updateStatusEl.textContent = 'Updating data...';

  try {
    const responses = await Promise.all([fetch(API_URLS.info), fetch(API_URLS.filter), fetch(API_URLS.online), fetch(PX_API_URL)]);
    const [infoData, filterData, onlineData, pxDataRes] = await Promise.all(responses.map((res) => (res.ok ? res.json() : null)));
    const pxMinted = pxDataRes && typeof pxDataRes.next_item_index === 'number' ? pxDataRes.next_item_index : 0;

    updateHeaderStats(infoData, onlineData, pxMinted);
    updatePixelDetails(infoData, filterData);

    const now = new Date();
    updateStatusEl.textContent = `Last updated: ${now.toLocaleTimeString()}. Auto-refreshing every 10 seconds.`;
  } catch (error) {
    console.error('Failed to fetch data:', error);
    updateStatusEl.textContent = 'Error updating data. Will try again shortly.';
  }
}

// Hàm cập nhật 6 chỉ số ở đầu trang
function updateHeaderStats(infoData, onlineData, pxMinted) {
  const rewardBank = infoData?.rewardBank;
  const tournamentBank = typeof rewardBank === 'number' ? rewardBank : undefined;

  let burnBank = infoData?.burnBank;
  if (typeof burnBank !== 'number' && typeof tournamentBank === 'number') {
    burnBank = Math.floor(tournamentBank / 2.35);
  }

  let totalBank = infoData?.totalBank;
  if (typeof totalBank !== 'number' && typeof tournamentBank === 'number' && typeof burnBank === 'number') {
    totalBank = tournamentBank + burnBank;
  }

  let liveTokenSupply = infoData?.liveTokenSupply;
  if (typeof liveTokenSupply !== 'number' && typeof burnBank === 'number') {
    liveTokenSupply = 245000000 - burnBank - 100000;
  }

  let onlinePlayers = onlineData?.current_visitors;
  if (typeof onlinePlayers !== 'number') onlinePlayers = undefined;

  let tournamentTradeVolume = infoData?.tournamentTradeVolume;
  if (typeof tournamentTradeVolume !== 'number' && typeof totalBank === 'number') {
    tournamentTradeVolume = Math.round(pxMinted + totalBank * 5.88);
  }

  document.getElementById('tournament-bank').textContent = formatNumber(Math.round(tournamentBank));
  document.getElementById('burn-bank').textContent = formatNumber(Math.round(burnBank));
  document.getElementById('total-bank').textContent = formatNumber(Math.round(totalBank));
  document.getElementById('live-supply').textContent = formatNumber(Math.round(liveTokenSupply));
  document.getElementById('online-players').textContent = formatNumber(onlinePlayers);
  document.getElementById('tournament-trade-volume').textContent = formatNumber(Math.round(tournamentTradeVolume));

  renderAutoTable(tournamentBank);
}

// Hàm cập nhật chi tiết Pixel
function updatePixelDetails(infoData, filterData) {
  const pixelArea = 1024 * 1024;
  const maxPixelArea = 1024 * 1024;
  document.getElementById('pixel-area-percentage').textContent = `${((pixelArea / maxPixelArea) * 100).toFixed(0)}%`;

  const totalAvailable = filterData?.totalAvailableCount;
  if (totalAvailable !== undefined) {
    const locked = pixelArea - totalAvailable;
    document.getElementById('pixel-available').textContent = formatNumber(totalAvailable);
    document.getElementById('pixel-available-percentage').textContent = `${((totalAvailable / pixelArea) * 100).toFixed(2)}%`;
    document.getElementById('pixel-locked').textContent = formatNumber(locked);
    document.getElementById('pixel-locked-percentage').textContent = `${((locked / pixelArea) * 100).toFixed(2)}%`;
  }

  const tableBody = document.querySelector('#pixel-price-table tbody');
  tableBody.innerHTML = '';
  const priceAvailability = filterData?.priceAvailability;

  if (priceAvailability && Object.keys(priceAvailability).length > 0) {
    const totalPixelsInList = Object.values(priceAvailability).reduce((sum, count) => sum + count, 0);
    const sortedPrices = Object.entries(priceAvailability).sort((a, b) => Number(a[0]) - Number(b[0]));

    sortedPrices.forEach(([price, count]) => {
      const percentage = totalPixelsInList > 0 ? ((count / totalPixelsInList) * 100).toFixed(2) : '0.00';
      const row = tableBody.insertRow();
      row.innerHTML = `
        <td class="price-cell">
          <img class="inline-logo" src="images/notpixellogov1.png" alt="PX">
          <span>${formatNumber(Number(price))}</span>
        </td>
        <td>${formatNumber(count)}</td>
        <td>${percentage}%</td>
      `;
    });
  } else {
    const row = tableBody.insertRow();
    row.innerHTML = `<td colspan="3" style="text-align: center;">No any price data not available. See Q&A #1 for more details.</td>`;
  }

  const mostExpensive = infoData?.mostExpensivePixel?.metaData;
  if (mostExpensive) {
    const { x, y, nextPrice, isAvailable } = mostExpensive;
    document.getElementById('most-expensive-coords').textContent = `(${x}, ${y})`;
    document.getElementById('most-expensive-link').href = `https://t.me/notpixel/app?startapp=x${x}_y${y}_mbattle`;
    document.getElementById('owner-buy-price').textContent = formatNumber(nextPrice / 2);
    document.getElementById('current-price').textContent = formatNumber(nextPrice);

    const statusEl = document.getElementById('pixel-status');
    statusEl.innerHTML = isAvailable
      ? `The pixel is not lockable & you can buy it if you are whale enough to pay ${formatNumber(nextPrice)} <img class="inline-logo" src="images/notpixellogov1.png" alt="PX Logo">`
      : `The pixel is lockable and you can't buy it, LOL maybe a whale is acting, stay ALERT xD`;
  } else {
    document.getElementById('most-expensive-coords').textContent = '(N/A, N/A)';
    document.getElementById('most-expensive-link').href = '#';
    document.getElementById('owner-buy-price').textContent = 'N/A';
    document.getElementById('current-price').textContent = 'N/A';
    document.getElementById('pixel-status').textContent = 'Not Available';
  }
}

// --- FILTER VÀ BIỂU ĐỒ ---
function filterData(range, customRange = {}) {
  if (!historyData || historyData.length === 0) return [];

  if (range === 'custom') {
    let { start, end } = customRange;
    const minTime = new Date(historyData[0].timestamp).getTime();
    const maxTime = new Date(historyData[historyData.length - 1].timestamp).getTime();
    let startTime = new Date(start).getTime();
    let endTime = new Date(end).getTime();

    if (isNaN(startTime) || startTime < minTime) startTime = minTime;
    if (isNaN(endTime) || endTime > maxTime) endTime = maxTime;
    if (startTime >= endTime) return [];

    return historyData.filter((d) => {
      const itemTime = new Date(d.timestamp).getTime();
      return itemTime >= startTime && itemTime <= endTime;
    });
  }

  const now = Date.now();
  const ranges = {
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
  };
  const ms = ranges[range] || Infinity;
  return historyData.filter((d) => now - new Date(d.timestamp).getTime() <= ms);
}

function drawNoDataMessage(ctx) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.save();
  ctx.fillStyle = '#ccc';
  ctx.font = 'bold 11px "M PLUS Rounded 1c", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const centerX = ctx.canvas.width / 2;
  const centerY = ctx.canvas.height / 2;
  ctx.fillText('Error or un-logic timeframe selected. Refresh to resolve', centerX, centerY);
  ctx.restore();
}

function renderChartGeneric(canvasId, chartInstanceRef, field, label, color, range = 'all', customRange = {}) {
  const data = filterData(range, customRange);
  const instance = window[chartInstanceRef];
  if (instance.current) instance.current.destroy();

  const ctx = document.getElementById(canvasId).getContext('2d');
  if (!data || data.length < 2) {
    drawNoDataMessage(ctx);
    instance.current = null;
    return;
  }

  const labels = data.map((d) => new Date(d.timestamp).toLocaleString());
  const values = data.map((d) => d[field]);

  instance.current = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label,
          data: values,
          borderColor: color,
          backgroundColor: color + '22',
          fill: true,
          tension: 0.2,
          pointBackgroundColor: '#fff',
          pointBorderColor: color,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBorderWidth: 2,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: { labels: { color, font: { weight: 'bold', size: 15, family: 'M PLUS Rounded 1c' } } },
        tooltip: {
          callbacks: { label: (ctx) => `${label}: ${ctx.formattedValue}` },
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#fff',
            font: { size: 13, family: 'M PLUS Rounded 1c' },
            maxRotation: 30,
            autoSkip: true,
            maxTicksLimit: 6,
            padding: 6,
          },
        },
        y: { ticks: { color: '#fff', font: { size: 13, family: 'M PLUS Rounded 1c' }, padding: 6 } },
      },
    },
  });
}

function applyRangeToAllCharts(range = 'all', customRange = {}) {
  renderChartGeneric('tournamentChart', 'tournamentChartInstanceRef', 'rewardBank', 'Tournament Bank', '#00f2ea', range, customRange);
  renderChartGeneric('liveTokenChart', 'liveTokenChartInstanceRef', 'liveTokenSupply', 'Live Token Supply', '#ffb300', range, customRange);
  renderChartGeneric('onlinePlayersChart', 'onlinePlayersChartInstanceRef', 'onlinePlayers', 'App Online Players', '#00e676', range, customRange);
  renderChartGeneric('tradeVolumeChart', 'tradeVolumeChartInstanceRef', 'tournamentTradeVolume', 'Tournament PX Trade Volume', '#00bcd4', range, customRange);
  // ĐÃ HỢP NHẤT: Sử dụng hàm chung để vẽ biểu đồ PX Remain
  renderChartGeneric('pxRemainChart', 'pxRemainChartInstanceRef', 'pxRemain', 'PX Remain', '#ff5252', range, customRange);
}

// --- CÁC HÀM TIỆN ÍCH KHÁC ---

function renderAutoTable(rewardBank) {
  const container = document.getElementById('auto-table-container');
  if (!container) return;
  if (typeof rewardBank !== 'number' || isNaN(rewardBank)) {
    container.innerHTML = `<p>Data is currently unavailable. Please check back later.</p>`;
    return;
  }
  const squad_bank_percentage = 0.39,
    rank_1_squad_reward_percentage = 0.03483,
    rank_16_squad_reward_percentage = 0.01613,
    first_buy_1px_bank_percentage = 0.3,
    px_holder_bank_percentage = 0.2,
    buy_final_bank_percentage = 0.1,
    most_expensive_pixel_bank_percentage = 0.01,
    Top1FromTop1Squad_ratio = 8367 / 7160341,
    Top64FromTop1Squad_ratio = 2857 / 7160341,
    Top1FromTop16Squad_ratio = 3185 / 7160341,
    Top64FromTop16Squad_ratio = 1087 / 7160341;
  const tournamentBank = Math.round(rewardBank),
    squadBank = Math.round(tournamentBank * squad_bank_percentage),
    rank1SquadReward = Math.round(tournamentBank * rank_1_squad_reward_percentage),
    rank16SquadReward = Math.round(tournamentBank * rank_16_squad_reward_percentage),
    top1FromTop1Squad = Math.round(tournamentBank * Top1FromTop1Squad_ratio),
    top64FromTop1Squad = Math.round(tournamentBank * Top64FromTop1Squad_ratio),
    top1FromTop16Squad = Math.round(tournamentBank * Top1FromTop16Squad_ratio),
    top64FromTop16Squad = Math.round(tournamentBank * Top64FromTop16Squad_ratio),
    firstBuy1PXBank = Math.round(tournamentBank * first_buy_1px_bank_percentage),
    Top1FirstBuy1PX_ratio = 8206 / 2148102,
    Top512FirstBuy1PX_ratio = 1767 / 2148102,
    top1FirstBuy1PX = Math.round(firstBuy1PXBank * Top1FirstBuy1PX_ratio),
    top512FirstBuy1PX = Math.round(firstBuy1PXBank * Top512FirstBuy1PX_ratio),
    pxHolderBank = Math.round(tournamentBank * px_holder_bank_percentage),
    Top1PXHolder_ratio = 5471 / 1432068,
    Top512PXHolder_ratio = 1178 / 1432068,
    top1PXHolder = Math.round(pxHolderBank * Top1PXHolder_ratio),
    top512PXHolder = Math.round(pxHolderBank * Top512PXHolder_ratio),
    buyFinalBank = Math.round(tournamentBank * buy_final_bank_percentage),
    Top1BuyFinal_ratio = 2735 / 716034,
    Top512BuyFinal_ratio = 590 / 716034,
    top1BuyFinal = Math.round(buyFinalBank * Top1BuyFinal_ratio),
    top512BuyFinal = Math.round(buyFinalBank * Top512BuyFinal_ratio),
    mostExpensivePixelBank = Math.round(tournamentBank * most_expensive_pixel_bank_percentage);
  const rows = [
    { label: 'Tournament Bank', color: '#ADD8E6', value: tournamentBank },
    { label: 'Squad Bank (39%)', color: '#ADD8E6', value: squadBank },
    { label: 'Rank 1 Squad', color: '#008000', value: rank1SquadReward },
    { label: 'Rank 16 Squad', color: '#008000', value: rank16SquadReward },
    { label: 'Top 1 - Rank 1 Squad', color: '#008000', value: top1FromTop1Squad },
    { label: 'Top 64 - Rank 1 Squad', color: '#008000', value: top64FromTop1Squad },
    { label: 'Top 1 - Rank 16 Squad', color: '#008000', value: top1FromTop16Squad },
    { label: 'Top 64 - Rank 16 Squad', color: '#008000', value: top64FromTop16Squad },
    { label: 'Buy 1PX Bank (30%) + NFT', color: '#ADD8E6', value: firstBuy1PXBank },
    { label: 'Top 1 Buy 1PX', color: '#FFA500', value: top1FirstBuy1PX },
    { label: 'Top 512 Buy 1PX', color: '#FFA500', value: top512FirstBuy1PX },
    { label: 'PX Holder Bank (20%) + NFT', color: '#ADD8E6', value: pxHolderBank },
    { label: 'Top 1 PX Holder', color: '#FFC0CB', value: top1PXHolder },
    { label: 'Top 512 PX Holder', color: '#FFC0CB', value: top512PXHolder },
    { label: 'Buy Final Bank (10%) + NFT', color: '#ADD8E6', value: buyFinalBank },
    { label: 'Top 1 Buy Final', color: '#90EE90', value: top1BuyFinal },
    { label: 'Top 512 Buy Final', color: '#90EE90', value: top512BuyFinal },
    { label: 'Most Expensive Bank (1%)', color: '#ADD8E6', value: mostExpensivePixelBank },
  ];
  let html = `<div style="margin: 24px 0 8px 0"><h3 style="text-align:center;color:#00f2ea;margin-bottom:10px;letter-spacing:1px;"><span class="live-emoji">🔴</span><span class="live-label">LIVE</span>Not Pixel Tournament Reward Distribution</h3><p style="text-align:center; font-size: 0.8em; color: #c0c0c0; margin-top: -8px; margin-bottom: 12px;">Data refreshes every 10s. Values ▲ / ▼ show the change since the last update.</p><div style="overflow-x:auto"><table class="excel-table"><tbody>`;
  rows.forEach((row, idx) => {
    let deltaHtml = '';
    if (prevRowValues && typeof prevRowValues[idx] === 'number') {
      const diff = row.value - prevRowValues[idx];
      if (diff > 0) deltaHtml = `<span class="delta-up"><span class="delta-arrow">▲</span>+${formatNumber(diff)}</span>`;
      else if (diff < 0) deltaHtml = `<span class="delta-down"><span class="delta-arrow">▼</span>${formatNumber(diff)}</span>`;
    }
    html += `<tr><th style="min-width:180px;text-align:left;background:${row.color};color:#222;font-weight:700;">${
      row.label
    }</th><td style="text-align:right;background:#181818;color:#fff;">${formatNumber(row.value)}${deltaHtml}</td></tr>`;
  });
  html += '</tbody></table></div></div>';
  container.innerHTML = html;
  prevRowValues = rows.map((r) => r.value);
}

function handleExcelUpload(event) {
  const file = event.target.files[0];
  const statusEl = document.getElementById('excel-upload-status');
  if (!file) {
    statusEl.textContent = 'No file selected.';
    return;
  }
  statusEl.textContent = 'Reading file...';
  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result),
      workbook = XLSX.read(data, { type: 'array' }),
      firstSheetName = workbook.SheetNames[0],
      worksheet = workbook.Sheets[firstSheetName],
      jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    if (jsonData.length === 0) {
      statusEl.textContent = 'Sheet has no data.';
      return;
    }
    const processedData = processExcelData(jsonData);
    renderExcelTable(processedData);
    statusEl.textContent = 'Data loaded.';
  };
  reader.onerror = function () {
    statusEl.textContent = 'Error reading file.';
  };
  reader.readAsArrayBuffer(file);
}

function processExcelData(data) {
  return data.map((row) => {
    if ('rewardBank' in row) row['Tournament Bank'] = row['rewardBank'];
    return row;
  });
}

function renderExcelTable(data) {
  const container = document.getElementById('excel-table-container');
  if (!data || data.length === 0) {
    container.innerHTML = '<p>No data to display.</p>';
    return;
  }
  let html = '<div style="overflow-x:auto"><table class="excel-table"><thead><tr>';
  const columns = Object.keys(data[0]);
  columns.forEach((col) => {
    html += `<th>${col}</th>`;
  });
  html += '</tr></thead><tbody>';
  data.forEach((row) => {
    html += '<tr>';
    columns.forEach((col) => {
      html += `<td>${row[col]}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function googleTranslateElementInit() {
  new google.translate.TranslateElement(
    { pageLanguage: 'en', includedLanguages: 'en,ja,vi,ko,tr,ar,ru', layout: google.translate.TranslateElement.InlineLayout.SIMPLE, autoDisplay: false },
    'google_translate_element'
  );
}

// --- KHỞI CHẠY KHI TẢI TRANG ---
document.addEventListener('DOMContentLoaded', () => {
  fetchDataAndUpdate();
  setInterval(fetchDataAndUpdate, 10000);

  fetch('history.json')
    .then((res) => {
      if (!res.ok) throw new Error('Failed to load history.json');
      return res.json();
    })
    .then((data) => {
      // TIỀN XỬ LÝ: Tính và thêm trường 'pxRemain' vào dữ liệu
      const processedData =
        data && data.length > 0
          ? data.map((d) => ({
              ...d,
              pxRemain: typeof d.pxMinted === 'number' ? PX_TOTAL - d.pxMinted : null,
            }))
          : [];

      historyData = processedData;
      applyRangeToAllCharts('all');

      // Update tips with first/last data frame times
      if (historyData.length > 0) {
        const first = new Date(historyData[0].timestamp);
        const last = new Date(historyData[historyData.length - 1].timestamp);
        const opts = { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' };
        const firstStr = first.toLocaleString(undefined, opts);
        const lastStr = last.toLocaleString(undefined, opts);
        const firstEl = document.getElementById('first-data-time');
        const lastEl = document.getElementById('last-data-time');
        if (firstEl) firstEl.textContent = firstStr;
        if (lastEl) lastEl.textContent = lastStr;
      }
    })
    .catch((error) => {
      console.error('Error with history.json:', error);
      historyData = [];
      applyRangeToAllCharts('all');
    });

  const filtersContainer = document.getElementById('chart-filter');
  if (filtersContainer) {
    filtersContainer.addEventListener('click', (event) => {
      const target = event.target;
      if (target.tagName !== 'BUTTON') return;

      if (target.dataset.range) {
        applyRangeToAllCharts(target.dataset.range);
      } else if (target.id === 'custom-range-btn') {
        const start = document.getElementById('start-datetime').value;
        const end = document.getElementById('end-datetime').value;
        applyRangeToAllCharts('custom', { start, end });
      }
    });
  }

  const excelInput = document.getElementById('excel-file-input');
  if (excelInput) excelInput.addEventListener('change', handleExcelUpload);

  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      document.getElementById('start-datetime').value = '';
      document.getElementById('end-datetime').value = '';
      fetchDataAndUpdate();
      fetch('history.json')
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load history.json');
          return res.json();
        })
        .then((data) => {
          // TIỀN XỬ LÝ: Tính và thêm trường 'pxRemain' vào dữ liệu (cũng cần ở đây khi refresh)
          const processedData =
            data && data.length > 0
              ? data.map((d) => ({
                  ...d,
                  pxRemain: typeof d.pxMinted === 'number' ? PX_TOTAL - d.pxMinted : null,
                }))
              : [];
          historyData = processedData;
          applyRangeToAllCharts('all');

          if (historyData.length > 0) {
            const first = new Date(historyData[0].timestamp);
            const last = new Date(historyData[historyData.length - 1].timestamp);
            const opts = { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' };
            const firstStr = first.toLocaleString(undefined, opts);
            const lastStr = last.toLocaleString(undefined, opts);
            const firstEl = document.getElementById('first-data-time');
            const lastEl = document.getElementById('last-data-time');
            if (firstEl) firstEl.textContent = firstStr;
            if (lastEl) lastEl.textContent = lastStr;
          }
        })
        .catch((error) => {
          console.error('Error with history.json:', error);
          historyData = [];
          applyRangeToAllCharts('all');
        });
    });
  }

  updatePXStats();
  setInterval(updatePXStats, 10000);
});

async function updatePXStats() {
  const pxStatsEl = document.getElementById('px-stats');
  try {
    const res = await fetch(PX_API_URL);
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    const minted = typeof data.next_item_index === 'number' ? data.next_item_index : null;
    if (minted === null) throw new Error('No Data');
    const mintedPercent = ((minted / PX_TOTAL) * 100).toFixed(2);
    const remain = PX_TOTAL - minted;
    const remainPercent = (100 - mintedPercent).toFixed(2);
    pxStatsEl.innerHTML = `
      <span class='px-total'>Total PX: ${PX_TOTAL.toLocaleString()} <img src='images/notpixellogov1.png' class='inline-logo'></span>
      <span class='px-divider'>|</span>
      <span class='px-minted'>PX Minted: ${minted.toLocaleString()} (${mintedPercent}%) <img src='images/notpixellogov1.png' class='inline-logo'></span>
      <span class='px-divider'>|</span>
      <span class='px-remain'>PX Remain: ${remain.toLocaleString()} (${remainPercent}%) <img src='images/notpixellogov1.png' class='inline-logo'></span>
    `;
  } catch (e) {
    pxStatsEl.innerHTML = 'No Available / Error';
  }
}

// CÁC HÀM CŨ ĐÃ ĐƯỢC XÓA: renderPXRemainChart, drawPXRemainChart
