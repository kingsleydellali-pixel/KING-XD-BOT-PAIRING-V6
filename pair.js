// ══════════════════════════════════════════════════════════════
//  KING XD V6 PAIRING — Pairing Code Backend
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
const { uploadSession } = require('./mega');
const { makeid } = require('./gen-id');

const logger = pino({ level: 'silent' });

// Store active pairing sessions
const pairingSessions = new Map();

async function generatePairingCode(phoneNumber, existingSessionId = null) {
  // Clean number
  const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
  if (cleanNumber.length < 10) {
    throw new Error('Invalid phone number. Include country code.');
  }

  // Session directory
  const sessionDir = path.join(__dirname, 'sessions', `pair_${makeid(8)}`);
  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

  // Create socket
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
        reject(new Error('Pairing timeout. Try again.'));
      }
    }, 120000); // 2 minutes

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr && !sock.authState.creds.registered && !resolved) {
        try {
          const code = await sock.requestPairingCode(cleanNumber);
          resolved = true;
          clearTimeout(timeout);

          // Store session for later
          pairingSessions.set(cleanNumber, { sock, sessionDir });

          resolve({
            success: true,
            code,
            phoneNumber: cleanNumber,
            message: `Enter this code in WhatsApp: ${code}`
          });
        } catch (err) {
          resolved = true;
          clearTimeout(timeout);
          reject(new Error(`Failed to get pairing code: ${err.message}`));
        }
      }

      if (connection === 'open') {
        console.log('✅ Paired successfully!');

        // Wait for credentials to be saved
        await new Promise(r => setTimeout(r, 3000));

        // Read session data
        const credsPath = path.join(sessionDir, 'creds.json');
        let sessionData = {};
        if (fs.existsSync(credsPath)) {
          sessionData = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
        }

        // Upload to MEGA
        const { sessionId } = await uploadSession(sessionData, process.env.MEGA_SESSION_PREFIX || 'KING-XD-V6~');

        // Send session ID to user via WhatsApp
        const userJid = jidNormalizedUser(`${cleanNumber}@s.whatsapp.net`);
        try {
          await sock.sendMessage(userJid, {
            text: `👑 *KING XD V6 PAIRING*\n\n✅ Connected successfully!\n\n🔐 *Your Session ID:*\n\`${sessionId}\`\n\n💡 Save this ID. Use it in your bot's SESSION_ID variable.\n\n👨‍💻 Developed by KINGSLEY-XMD TECH`
          });
        } catch (e) {
          console.log('Could not send session ID:', e.message);
        }

        // Clean up
        setTimeout(() => {
          try { sock.end(); } catch (e) { /* ignore */ }
          pairingSessions.delete(cleanNumber);
        }, 5000);
      }

      if (connection === 'close') {
        const reason = lastDisconnect?.error?.output?.statusCode;
        if (reason === 401 && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(new Error('Pairing rejected. Code may be invalid.'));
        }
      }
    });
  });
}

module.exports = { generatePairingCode };