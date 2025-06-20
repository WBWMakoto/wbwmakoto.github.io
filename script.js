// Cấu hình các API endpoint
const API_URLS = {
  info: 'https://notpixel.org/api/v1/battle-canvas/info',
  filter: 'https://notpixel.org/api/v1/battle-canvas/pixels/filter-info',
  online: 'https://notpixel.org/api/v1/history/online/stats',
};

// Hàm để định dạng số cho dễ đọc (ví dụ: 1,000,000)
function formatNumber(num) {
  if (typeof num !== 'number' || isNaN(num)) return 'N/A';
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
  const rewardBank = infoData?.rewardBank;
  const burnBank = infoData?.burnBank;

  document.getElementById('tournament-bank').textContent = formatNumber(Math.round(rewardBank));
  document.getElementById('burn-bank').textContent = formatNumber(Math.round(burnBank));

  if (rewardBank !== undefined && burnBank !== undefined) {
    document.getElementById('total-bank').textContent = formatNumber(Math.round(rewardBank + burnBank));
  } else {
    document.getElementById('total-bank').textContent = 'Not Available';
  }

  // Sửa logic Live Token Supply
  document.getElementById('live-supply').textContent = burnBank !== undefined ? formatNumber(245000000 - burnBank) : formatNumber(245000000);
  document.getElementById('online-players').textContent = formatNumber(onlineData?.current_visitors);
}

// Hàm cập nhật chi tiết Pixel (Đã viết lại)
function updatePixelDetails(infoData, filterData) {
  // 1. Cập nhật Pixel Area
  const pixelArea = 512 * 512;
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

// Chạy lần đầu khi tải trang
document.addEventListener('DOMContentLoaded', () => {
  fetchDataAndUpdate();
  setInterval(fetchDataAndUpdate, 10000);
});
