// ══════════════════════════════════════════════════════════════
//  KING XD V6 PAIRING — QR Code Backend
//  Developed by KINGSLEY-XMD TECH
// ══════════════════════════════════════════════════════════════

const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
  jidNormalizedUser
} = require('@whiskeysockets/baileys');

const pino = require('pino');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { uploadSession } = require('./mega');
const { makeid } = require('./gen-id');

const logger = pino({ level: 'silent' });

async function generateQR() {
  const sessionDir = path.join(__dirname, 'sessions', `qr_${makeid(8)}`);
  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    browser: Browsers.macOS('Chrome'),
    generateHighQualityLinkPreview: true
  });

  return new Promise((resolve, reject) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('QR timeout. Try again.'));
      }
    }, 60000);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr && !resolved) {
        try {
          const qrDataURL = await QRCode.toDataURL(qr, {
            color: { dark: '#00ff88', light: '#0a0a0a' },
            width: 300
          });
          resolved = true;
          clearTimeout(timeout);
          resolve({ success: true, qr: qrDataURL, raw: qr });
        } catch (err) {
          resolved = true;
          clearTimeout(timeout);
          reject(new Error(`QR generation failed: ${err.message}`));
        }
      }

      if (connection === 'open') {
        console.log('✅ QR paired successfully!');
        await new Promise(r => setTimeout(r, 3000));

        const credsPath = path.join(sessionDir, 'creds.json');
        let sessionData = {};
        if (fs.existsSync(credsPath)) {
          sessionData = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
        }

        const { sessionId } = await uploadSession(sessionData, process.env.MEGA_SESSION_PREFIX || 'KING-XD-V6~');

        // Get user JID from creds
        const me = sock.user?.id;
        if (me) {
          const userJid = jidNormalizedUser(me);
          try {
            await sock.sendMessage(userJid, {
              text: `👑 *KING XD V6 PAIRING*\n\n✅ Connected via QR!\n\n🔐 *Your Session ID:*\n\`${sessionId}\`\n\n💡 Save this. Use in your bot.\n\n👨‍💻 KINGSLEY-XMD TECH`
            });
          } catch (e) { /* ignore */ }
        }

        setTimeout(() => {
          try { sock.end(); } catch (e) { /* ignore */ }
        }, 5000);
      }
    });
  });
}

module.exports = { generateQR };