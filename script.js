// Cấu hình các API endpoint
const API_URLS = {
  info: 'https://notpixel.org/api/v1/battle-canvas/info',
  filter: 'https://notpixel.org/api/v1/battle-canvas/pixels/filter-info',
  online: 'https://notpixel.org/api/v1/history/online/stats',
};

// Hàm để định dạng số cho dễ đọc (ví dụ: 1,000,000)
function formatNumber(num) {
  if (typeof num !== 'number' || isNaN(num)) return 'Not Available';
  return num.toLocaleString('en-US');
}

// Hàm chính để lấy và cập nhật dữ liệu
async function fetchDataAndUpdate() {
  const updateStatusEl = document.getElementById('update-status');
  updateStatusEl.textContent = 'Updating data...';

  try {
    const responses = await Promise.all([fetch(API_URLS.info), fetch(API_URLS.filter), fetch(API_URLS.online)]);

    const [infoData, filterData, onlineData] = await Promise.all(responses.map((res) => (res.ok ? res.json() : null)));

    updateHeaderStats(infoData, onlineData);
    updatePixelDetails(infoData, filterData);

    const now = new Date();
    updateStatusEl.textContent = `Last updated: ${now.toLocaleTimeString()}. Auto-refreshing every 10 seconds.`;
  } catch (error) {
    console.error('Failed to fetch data:', error);
    updateStatusEl.textContent = 'Error updating data. Will try again shortly.';
  }
}

// Hàm cập nhật 5 chỉ số ở đầu trang
function updateHeaderStats(infoData, onlineData) {
  // Tournament Bank
  const rewardBank = infoData?.rewardBank;
  const tournamentBank = typeof rewardBank === 'number' ? rewardBank : undefined;

  // Burn Bank: API hoặc fallback
  let burnBank = infoData?.burnBank;
  if (typeof burnBank !== 'number' && typeof tournamentBank === 'number') {
    burnBank = Math.floor(tournamentBank / 2.35);
  }

  // Total Bank: API hoặc fallback
  let totalBank = infoData?.totalBank;
  if (typeof totalBank !== 'number' && typeof tournamentBank === 'number' && typeof burnBank === 'number') {
    totalBank = tournamentBank + burnBank;
  }

  // Live Token Supply: API hoặc fallback
  let liveTokenSupply = infoData?.liveTokenSupply;
  if (typeof liveTokenSupply !== 'number' && typeof burnBank === 'number') {
    liveTokenSupply = 245000000 - burnBank - 100000;
  }

  // Online Players: API hoặc fallback
  let onlinePlayers = onlineData?.current_visitors;
  if (typeof onlinePlayers !== 'number') onlinePlayers = undefined;

  // Tournament Trade Volume: API hoặc fallback
  let tournamentTradeVolume = infoData?.tournamentTradeVolume;
  if (typeof tournamentTradeVolume !== 'number' && typeof totalBank === 'number') {
    tournamentTradeVolume = Math.round(1024 * 1024 + totalBank * 5.88);
  }

  // Cập nhật UI
  document.getElementById('tournament-bank').textContent = formatNumber(Math.round(tournamentBank));
  document.getElementById('burn-bank').textContent = formatNumber(Math.round(burnBank));
  document.getElementById('total-bank').textContent = formatNumber(Math.round(totalBank));
  document.getElementById('live-supply').textContent = formatNumber(Math.round(liveTokenSupply));
  document.getElementById('online-players').textContent = formatNumber(onlinePlayers);
  document.getElementById('tournament-trade-volume').textContent = formatNumber(Math.round(tournamentTradeVolume));

  // Gọi hàm renderAutoTable
  renderAutoTable(tournamentBank);
}

// Hàm cập nhật chi tiết Pixel (Đã viết lại)
function updatePixelDetails(infoData, filterData) {
  // 1. Cập nhật Pixel Area
  const pixelArea = 1024 * 1024; // Đã mở full map, hiển thị 100%
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

  // 2. Cập nhật bảng giá Pixel Buy Price (Đã cải thiện)
  const tableBody = document.querySelector('#pixel-price-table tbody');
  tableBody.innerHTML = ''; // Xóa dữ liệu cũ
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
    const cell = row.insertCell();
    cell.colSpan = 3;
    cell.textContent = 'No any price data not available. See Q&A #1 for more details.';
    cell.style.textAlign = 'center';
  }

  // 3. Cập nhật Most Expensive Pixel (Sửa lỗi quan trọng)
  const mostExpensive = infoData?.mostExpensivePixel?.metaData;
  if (mostExpensive) {
    const { x, y, nextPrice, isAvailable } = mostExpensive;
    document.getElementById('most-expensive-coords').textContent = `(${x}, ${y})`;
    document.getElementById('most-expensive-link').href = `https://t.me/notpixel/app?startapp=x${x}_y${y}_mbattle`;
    document.getElementById('owner-buy-price').textContent = formatNumber(nextPrice / 2);
    document.getElementById('current-price').textContent = formatNumber(nextPrice);

    // **SỬA LỖI QUAN TRỌNG: Dùng innerHTML để chèn logo**
    const statusEl = document.getElementById('pixel-status');
    if (isAvailable) {
      statusEl.innerHTML = `The pixel is not lockable & you can buy it if you are whale enough to pay ${formatNumber(
        nextPrice
      )} <img class="inline-logo" src="images/notpixellogov1.png" alt="PX Logo">`;
    } else {
      statusEl.innerHTML = `The pixel is lockable and you can't buy it, LOL maybe a whale is acting, stay ALERT xD`;
    }
  } else {
    // Reset nếu không có data
    document.getElementById('most-expensive-coords').textContent = '(N/A, N/A)';
    document.getElementById('most-expensive-link').href = '#';
    document.getElementById('owner-buy-price').textContent = 'N/A';
    document.getElementById('current-price').textContent = 'N/A';
    document.getElementById('pixel-status').textContent = 'Not Available';
  }
}

// Khởi tạo Google Translate
function googleTranslateElementInit() {
  new google.translate.TranslateElement(
    {
      pageLanguage: 'en',
      includedLanguages: 'en,ja,vi,ko,tr,ar,ru',
      layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
      autoDisplay: false,
    },
    'google_translate_element'
  );
}

// --- ĐẢM BẢO applyRangeToAllCharts chỉ gọi sau khi DOM ready và historyData đã load xong ---
let historyLoaded = false;
let domLoaded = false;
function tryAutoApplyRange() {
  if (historyLoaded && domLoaded) {
    applyRangeToAllCharts();
  }
}
document.addEventListener('DOMContentLoaded', () => {
  domLoaded = true;
  tryAutoApplyRange();

  // Thêm sự kiện cho upload Excel
  const excelInput = document.getElementById('excel-file-input');
  if (excelInput) {
    excelInput.addEventListener('change', handleExcelUpload);
  }

  // Thêm sự kiện cho custom range filter
  const applyBtn = document.getElementById('apply-custom-range');
  if (applyBtn) {
    applyBtn.addEventListener('click', function () {
      const start = document.getElementById('start-datetime').value;
      const end = document.getElementById('end-datetime').value;
      if (!start && !end) {
        // Nếu cả hai đều rỗng, hiển thị toàn bộ dữ liệu
        applyRangeToAllCharts('all', {});
      } else {
        applyRangeToAllCharts('custom', { start, end });
      }
    });
  }
});

function handleExcelUpload(event) {
  const file = event.target.files[0];
  const statusEl = document.getElementById('excel-upload-status');
  if (!file) {
    statusEl.textContent = 'No file selected.';
    return;
  }
  statusEl.textContent = 'Đang đọc file...';
  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    // Lấy sheet đầu tiên
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    // Chuyển sheet thành array object
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    if (jsonData.length === 0) {
      statusEl.textContent = 'Sheet không có dữ liệu.';
      return;
    }
    // Tính toán lại các cột nếu cần
    const processedData = processExcelData(jsonData);
    renderExcelTable(processedData);
    statusEl.textContent = 'Đã tải dữ liệu.';
  };
  reader.onerror = function () {
    statusEl.textContent = 'Lỗi khi đọc file.';
  };
  reader.readAsArrayBuffer(file);
}

// Hàm xử lý dữ liệu: Tournament Bank = rewardBank, các cột còn lại giữ nguyên hoặc tính tỷ trọng nếu có
function processExcelData(data) {
  // Nếu có cột 'rewardBank', tạo cột 'Tournament Bank' = rewardBank
  // Nếu đã có cột 'Tournament Bank', sẽ ghi đè bằng rewardBank
  return data.map((row) => {
    if ('rewardBank' in row) {
      row['Tournament Bank'] = row['rewardBank'];
    }
    // Nếu bạn muốn tính thêm tỷ trọng các cột khác, có thể bổ sung ở đây
    // Ví dụ: row['Tỷ trọng'] = row['rewardBank'] / tổng rewardBank
    return row;
  });
}

// Hàm hiển thị bảng dữ liệu ra HTML
function renderExcelTable(data) {
  const container = document.getElementById('excel-table-container');
  if (!data || data.length === 0) {
    container.innerHTML = '<p>No data to display.</p>';
    return;
  }
  // Tạo bảng
  let html = '<div style="overflow-x:auto"><table class="excel-table"><thead><tr>';
  // Lấy tất cả các cột
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

// Lưu giá trị cũ của các chỉ số để so sánh tăng/giảm
let prevRowValues = null;

function renderAutoTable(rewardBank) {
  const container = document.getElementById('auto-table-container');
  if (!container) return;
  if (typeof rewardBank !== 'number' || isNaN(rewardBank)) {
    container.innerHTML = `<p>
        If you see this, it means the Not Pixel team has closed all their data, and there is nothing I can do about it.<br>
        Honestly, I am still happy even if that happens, because this project is a special memory for me.<br>
        It brings me back to the 2018 era, before I even started studying at Tokyo University, when I created this with my Vietnamese brother, who also helped me host this website.<br>
        This is not the end—many ideas are still waiting for me to realize, and you can contact <b>@mikaakabano</b> to suggest what I should do next.<br>
        Play Not Pixel to support them (and me!) by clicking 
        <a href="https://t.me/notpixel/app?startapp=f5822071900_s577266" target="_blank">here</a>.
      </p>`;
    return;
  }
  // Các tỷ lệ phần trăm
  const squad_bank_percentage = 0.39;
  const rank_1_squad_reward_percentage = 0.03483;
  const rank_16_squad_reward_percentage = 0.01613;
  const first_buy_1px_bank_percentage = 0.3;
  const px_holder_bank_percentage = 0.2;
  const buy_final_bank_percentage = 0.1;
  const most_expensive_pixel_bank_percentage = 0.01;

  // Các tỷ lệ thực tế từ mẫu (Tournament Bank = 7,160,341)
  const Top1FromTop1Squad_ratio = 8367 / 7160341;
  const Top64FromTop1Squad_ratio = 2857 / 7160341;
  const Top1FromTop16Squad_ratio = 3185 / 7160341;
  const Top64FromTop16Squad_ratio = 1087 / 7160341;

  // Các giá trị Bank
  const tournamentBank = Math.round(rewardBank);
  const squadBank = Math.round(tournamentBank * squad_bank_percentage);
  const rank1SquadReward = Math.round(tournamentBank * rank_1_squad_reward_percentage);
  const rank16SquadReward = Math.round(tournamentBank * rank_16_squad_reward_percentage);

  // Thành viên Squad (tính theo tỷ lệ thực tế mẫu)
  const top1FromTop1Squad = Math.round(tournamentBank * Top1FromTop1Squad_ratio);
  const top64FromTop1Squad = Math.round(tournamentBank * Top64FromTop1Squad_ratio);
  const top1FromTop16Squad = Math.round(tournamentBank * Top1FromTop16Squad_ratio);
  const top64FromTop16Squad = Math.round(tournamentBank * Top64FromTop16Squad_ratio);

  // First Buy 1PX
  const firstBuy1PXBank = Math.round(tournamentBank * first_buy_1px_bank_percentage);
  const Top1FirstBuy1PX_ratio = 8206 / 2148102;
  const Top512FirstBuy1PX_ratio = 1767 / 2148102;
  const top1FirstBuy1PX = Math.round(firstBuy1PXBank * Top1FirstBuy1PX_ratio);
  const top512FirstBuy1PX = Math.round(firstBuy1PXBank * Top512FirstBuy1PX_ratio);

  // PX Holder
  const pxHolderBank = Math.round(tournamentBank * px_holder_bank_percentage);
  const Top1PXHolder_ratio = 5471 / 1432068;
  const Top512PXHolder_ratio = 1178 / 1432068;
  const top1PXHolder = Math.round(pxHolderBank * Top1PXHolder_ratio);
  const top512PXHolder = Math.round(pxHolderBank * Top512PXHolder_ratio);

  // Buy Final
  const buyFinalBank = Math.round(tournamentBank * buy_final_bank_percentage);
  const Top1BuyFinal_ratio = 2735 / 716034;
  const Top512BuyFinal_ratio = 590 / 716034;
  const top1BuyFinal = Math.round(buyFinalBank * Top1BuyFinal_ratio);
  const top512BuyFinal = Math.round(buyFinalBank * Top512BuyFinal_ratio);

  // Most Expensive Pixel
  const mostExpensivePixelBank = Math.round(tournamentBank * most_expensive_pixel_bank_percentage);

  // Mapping tên cột và mã màu hex (A-R)
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

  let html = '<div style="margin: 24px 0 8px 0">';
  html +=
    '<h3 style="text-align:center;color:#00f2ea;margin-bottom:10px;letter-spacing:1px;">' +
    '<span class="live-emoji">🔴</span><span class="live-label">LIVE</span>Not Pixel Tournament Reward Distribution</h3>';
  html += '<p style="text-align:center; font-size: 0.8em; color: #c0c0c0; margin-top: -8px; margin-bottom: 12px;">Data refreshes every 10s. Values ▲ / ▼ show the change since the last update.</p>';
  html += '<div style="overflow-x:auto">';
  html += '<table class="excel-table"><tbody>';
  rows.forEach((row, idx) => {
    let deltaHtml = '';
    if (prevRowValues && typeof prevRowValues[idx] === 'number') {
      const diff = row.value - prevRowValues[idx];
      if (diff > 0) {
        deltaHtml = `<span class=\"delta-up\"><span class=\"delta-arrow\">▲</span>+${formatNumber(diff)}</span>`;
      } else if (diff < 0) {
        deltaHtml = `<span class=\"delta-down\"><span class=\"delta-arrow\">▼</span>${formatNumber(diff)}</span>`;
      }
    }
    html += `<tr><th style=\"min-width:180px;text-align:left;background:${row.color};color:#222;font-weight:700;\">${
      row.label
    }</th><td style=\"text-align:right;background:#181818;color:#fff;\">${formatNumber(row.value)}${deltaHtml}</td></tr>`;
  });
  html += '</tbody></table></div></div>';
  container.innerHTML = html;
  // Lưu lại giá trị hiện tại để so sánh lần sau
  prevRowValues = rows.map((r) => r.value);
}

let chartInstance = null;
let historyData = [];

function filterData(range, customRange = {}) {
  if (range === 'custom') {
    const { start, end } = customRange;
    if (!start || !end) {
      return historyData; // Trả về toàn bộ nếu không có ngày tháng
    }
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();

    if (startTime >= endTime) {
      alert('Start date must be before end date.');
      // Clear end date input và focus lại
      const endInput = document.getElementById('end-datetime');
      if (endInput) {
        endInput.value = '';
        endInput.focus();
      }
      return []; // Trả về mảng rỗng để không vẽ gì
    }

    return historyData.filter((d) => {
      const itemTime = new Date(d.timestamp).getTime();
      return itemTime >= startTime && itemTime <= endTime;
    });
  }

  const now = Date.now();
  let ms = Infinity;
  if (range === 'minute') ms = 60 * 60 * 1000;
  if (range === 'hour') ms = 24 * 60 * 60 * 1000;
  if (range === 'day') ms = 7 * 24 * 60 * 60 * 1000;
  if (range === 'week') ms = 30 * 24 * 60 * 60 * 1000;
  return historyData.filter((d) => range === 'all' || now - new Date(d.timestamp).getTime() <= ms);
}

function getSmartXTicksConfig(labels) {
  // Nếu số điểm > 8 thì nghiêng, giảm số nhãn, chỉ hiện giờ:phút
  if (labels.length > 8) {
    return {
      color: '#fff',
      font: { size: 12, family: 'M PLUS Rounded 1c' },
      maxRotation: 45,
      minRotation: 30,
      autoSkip: true,
      maxTicksLimit: 4,
      padding: 4,
      callback: function (value, index, values) {
        const label = this.getLabelForValue(value);
        const date = new Date(label);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      },
    };
  } else {
    // Ít điểm: nằm ngang, hiện ngày + giờ
    return {
      color: '#fff',
      font: { size: 13, family: 'M PLUS Rounded 1c' },
      maxRotation: 0,
      minRotation: 0,
      autoSkip: false,
      maxTicksLimit: labels.length,
      padding: 6,
      callback: function (value, index, values) {
        const label = this.getLabelForValue(value);
        const date = new Date(label);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      },
    };
  }
}

// Sửa lại thông báo lỗi trên canvas thành 2 dòng, căn giữa
function drawNoDataMessage(ctx) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = 'white';
  ctx.font = '17px "M PLUS Rounded 1c", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Refresh the page to solve - 99.99% work.', ctx.canvas.width / 2, ctx.canvas.height / 2);
}

// --- SỬA renderChart ---
function renderChart(range = 'all', customRange = {}) {
  const data = filterData(range, customRange);
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
  const ctx = document.getElementById('tournamentChart').getContext('2d');
  if (data.length < 2) {
    drawNoDataMessage(ctx);
    return;
  }
  const labels = data.map((d) => new Date(d.timestamp).toLocaleString());
  const values = data.map((d) => d.rewardBank);
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Tournament Bank',
          data: values,
          borderColor: '#00f2ea',
          backgroundColor: 'rgba(0,242,234,0.13)',
          fill: true,
          tension: 0.2,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#00f2ea',
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBorderWidth: 2,
        },
      ],
    },
    options: {
      plugins: {
        legend: { labels: { color: '#00f2ea', font: { weight: 'bold', size: 15, family: 'M PLUS Rounded 1c' } } },
        tooltip: {
          enabled: true,
          backgroundColor: '#222',
          titleColor: '#00f2ea',
          bodyColor: '#fff',
          borderColor: '#00f2ea',
          borderWidth: 2,
          titleFont: { weight: 'bold', size: 15, family: 'M PLUS Rounded 1c' },
          bodyFont: { size: 15, family: 'M PLUS Rounded 1c' },
          padding: 10,
          callbacks: {
            label: function (context) {
              return 'Tournament Bank: ' + context.formattedValue;
            },
          },
        },
      },
      layout: { padding: 10 },
      scales: {
        x: getSmartXTicksConfig(labels),
        y: {
          ticks: {
            color: '#fff',
            font: { size: 13, family: 'M PLUS Rounded 1c' },
            padding: 6,
          },
        },
      },
    },
  });
}

fetch('history.json')
  .then((res) => res.json())
  .then((data) => {
    historyData = data;
    window.historyData = data;
    historyLoaded = true;
    tryAutoApplyRange();
  });

function getDeltaAt(history, nowIdx, msAgo) {
  const nowTime = new Date(history[nowIdx].timestamp).getTime();
  // Tìm bản ghi gần nhất trước mốc msAgo
  for (let i = nowIdx - 1; i >= 0; i--) {
    const t = new Date(history[i].timestamp).getTime();
    if (nowTime - t >= msAgo) {
      return history[nowIdx].rewardBank - history[i].rewardBank;
    }
  }
  return null; // Không tìm thấy
}

// Khi render bảng hoặc biểu đồ:
const ms5min = 5 * 60 * 1000;
const ms1h = 60 * 60 * 1000;
const ms1d = 24 * 60 * 60 * 1000;
const ms1w = 7 * 24 * 60 * 60 * 1000;

historyData.forEach((point, idx) => {
  const delta5min = getDeltaAt(historyData, idx, ms5min);
  const delta1h = getDeltaAt(historyData, idx, ms1h);
  const delta1d = getDeltaAt(historyData, idx, ms1d);
  const delta1w = getDeltaAt(historyData, idx, ms1w);
  // Hiển thị các delta này bên cạnh giá trị point.rewardBank
});

// --- Thêm các biến toàn cục cho các biểu đồ mới ---
let liveTokenChartInstance = null;
let onlinePlayersChartInstance = null;
let tradeVolumeChartInstance = null;

// --- Hàm vẽ biểu đồ chung cho các trường ---
function renderCustomChart(canvasId, chartInstanceRef, field, range = 'all', customRange = {}) {
  const data = filterData(range, customRange);
  if (chartInstanceRef && chartInstanceRef.current) {
    chartInstanceRef.current.destroy();
    chartInstanceRef.current = null;
  }
  const ctx = document.getElementById(canvasId).getContext('2d');
  if (!data.length || data.length < 2) {
    drawNoDataMessage(ctx);
    return;
  }
  const labels = data.map((d) => new Date(d.timestamp).toLocaleString());
  const values = data.map((d) => d[field]);
  let color, label;
  if (field === 'liveTokenSupply') {
    color = '#ffb300';
    label = 'Live Token Supply';
  } else if (field === 'onlinePlayers') {
    color = '#00e676';
    label = 'App Online Players';
  } else if (field === 'tournamentTradeVolume') {
    color = '#00bcd4';
    label = 'Tournament PX Trade Volume';
  } else {
    color = '#00f2ea';
    label = 'Tournament Bank';
  }
  chartInstanceRef.current = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: label,
          data: values,
          borderColor: color,
          backgroundColor: 'rgba(0,242,234,0.13)',
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
      plugins: {
        legend: { labels: { color: color, font: { weight: 'bold', size: 15, family: 'M PLUS Rounded 1c' } } },
        tooltip: {
          enabled: true,
          backgroundColor: '#222',
          titleColor: color,
          bodyColor: '#fff',
          borderColor: color,
          borderWidth: 2,
          titleFont: { weight: 'bold', size: 15, family: 'M PLUS Rounded 1c' },
          bodyFont: { size: 15, family: 'M PLUS Rounded 1c' },
          padding: 10,
          callbacks: {
            label: function (context) {
              return label + ': ' + context.formattedValue;
            },
          },
        },
      },
      layout: { padding: 10 },
      scales: {
        x: getSmartXTicksConfig(labels),
        y: {
          ticks: {
            color: '#fff',
            font: { size: 13, family: 'M PLUS Rounded 1c' },
            padding: 6,
          },
        },
      },
    },
  });
}

// Hàm đồng bộ filter cho 4 biểu đồ
function applyRangeToAllCharts(range = 'all', customRange = {}) {
  renderChart(range, customRange);
  // 3 biểu đồ phụ
  renderCustomChart('liveTokenChart', { current: window.liveTokenChartInstance }, 'liveTokenSupply', range, customRange);
  renderCustomChart('onlinePlayersChart', { current: window.onlinePlayersChartInstance }, 'onlinePlayers', range, customRange);
  renderCustomChart('tradeVolumeChart', { current: window.tradeVolumeChartInstance }, 'tournamentTradeVolume', range, customRange);
}
