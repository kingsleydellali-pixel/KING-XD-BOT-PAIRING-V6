// ══════════════════════════════════════════════════════════════
//  KING XD V6 PAIRING — Frontend Pairing Logic
//  Developed by KINGSLEY-XMD TECH
// ══════════════════════════════════════════════════════════════

async function requestPair() {
  const phone = document.getElementById('phone').value.trim();
  const btn = document.getElementById('pairBtn');
  const loader = document.getElementById('loader');
  const errorEl = document.getElementById('error');
  const result = document.getElementById('result');
  const codeDisplay = document.getElementById('codeDisplay');

  if (!phone || phone.length < 10) {
    errorEl.textContent = '❌ Enter a valid number with country code.';
    errorEl.classList.add('show');
    return;
  }

  // Reset
  errorEl.classList.remove('show');
  result.classList.remove('show');
  btn.disabled = true;
  loader.classList.add('show');

  try {
    const res = await fetch('/api/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: phone })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Failed to generate code');

    // Format code as XXXX-XXXX
    const code = data.code;
    const formatted = code.length === 8
      ? code.slice(0, 4) + '-' + code.slice(4)
      : code;

    codeDisplay.textContent = formatted;
    result.classList.add('show');

    // Poll for session ID (optional)
    pollSession(phone, data.sessionId);
  } catch (err) {
    errorEl.textContent = '❌ ' + err.message;
    errorEl.classList.add('show');
  } finally {
    btn.disabled = false;
    loader.classList.remove('show');
  }
}

// ─── Poll for session ID delivery ───────────────────────────────
async function pollSession(phone, sessionId) {
  // Session is sent via WhatsApp after pairing.
  // You can optionally poll a status endpoint here.
  console.log('⏳ Waiting for pairing confirmation...');
}

// ─── Auto-format phone input ────────────────────────────────────
document.getElementById('phone').addEventListener('input', function(e) {
  this.value = this.value.replace(/[^0-9]/g, '');
});