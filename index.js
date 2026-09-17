// ══════════════════════════════════════════════════════════════
//  KING XD V6 PAIRING — Main Server
//  Developed by KINGSLEY-XMD TECH
// ══════════════════════════════════════════════════════════════

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { initMega } = require('./mega');

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_NAME = process.env.BOT_NAME || 'KING XD V6 PAIRING';
const DEVELOPER = process.env.DEVELOPER || 'KINGSLEY-XMD TECH';

// ─── Middleware ─────────────────────────────────────────────────
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// ─── Init MEGA ──────────────────────────────────────────────────
if (process.env.MEGA_EMAIL && process.env.MEGA_PASS) {
  initMega(process.env.MEGA_EMAIL, process.env.MEGA_PASS);
}

// ─── Routes ─────────────────────────────────────────────────────

// Landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'main.html'));
});

// Pairing page (code entry)
app.get('/pair', (req, res) => {
  res.sendFile(path.join(__dirname, 'pair.html'));
});

// QR page
app.get('/qr', (req, res) => {
  res.sendFile(path.join(__dirname, 'qr.html'));
});

// API: Generate pairing code
app.post('/api/pair', async (req, res) => {
  const { phoneNumber, sessionId } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number required' });
  }

  try {
    // Import pairing logic
    const { generatePairingCode } = require('./pair');
    const result = await generatePairingCode(phoneNumber, sessionId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Generate QR
app.post('/api/qr', async (req, res) => {
  try {
    const { generateQR } = require('./qr');
    const result = await generateQR();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', bot: BOT_NAME, developer: DEVELOPER });
});

// ─── Start ──────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`👑 ${BOT_NAME}`);
  console.log(`👨‍💻 Developed by ${DEVELOPER}`);
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`📱 Pair: http://localhost:${PORT}/pair`);
  console.log(`📷 QR:   http://localhost:${PORT}/qr`);
});