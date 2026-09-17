// ══════════════════════════════════════════════════════════════
//  KING XD V6 PAIRING — Frontend QR Logic
//  Developed by KINGSLEY-XMD TECH
// ══════════════════════════════════════════════════════════════

async function refreshQR() {
  const qrBox = document.getElementById('qrBox');
  const errorEl = document.getElementById('error');

  errorEl.classList.remove('show');
  qrBox.innerHTML = '<div class="loader"></div>';

  try {
    const res = await fetch('/api/qr', { method: 'POST' });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Failed to generate QR');

    qrBox.innerHTML = `<img src="${data.qr}" alt="QR Code">`;
  } catch (err) {
    qrBox.innerHTML = '<p style="color:#555;">QR unavailable</p>';
    errorEl.textContent = '❌ ' + err.message;
    errorEl.classList.add('show');
  }
}

// Auto-load QR on page open
refreshQR();