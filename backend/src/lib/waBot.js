import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import QRCode from 'qrcode';

let sock = null;
let latestQrDataUrl = null;

export async function initWhatsAppBot() {
  const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      latestQrDataUrl = await QRCode.toDataURL(qr);
      console.log('[waBot] Naya QR code ready hai web page par!');
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('[waBot] Connection closed, reconnecting:', shouldReconnect);
      if (shouldReconnect) {
        initWhatsAppBot();
      }
    } else if (connection === 'open') {
      latestQrDataUrl = null;
      console.log('[waBot] WhatsApp successfully connected! ✅');
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

export function getQrPageHtml() {
  if (!latestQrDataUrl) {
    return '<h3>WhatsApp connected hai ya QR load ho raha hai... (Page refresh karein)</h3>';
  }
  return `
    <html>
      <head><meta http-equiv="refresh" content="20"><title>Scan WhatsApp</title></head>
      <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#f0f2f5;">
        <h2>Apne WhatsApp se scan karein</h2>
        <img src="${latestQrDataUrl}" style="width:300px;height:300px;border:1px solid #ccc;padding:10px;border-radius:8px;background:#fff;" />
        <p style="color:#666;">Har 20 second me auto-refresh hoga</p>
      </body>
    </html>
  `;
}

export async function sendWhatsAppMessage(phone, message) {
  if (!sock) throw new Error('WhatsApp bot is not initialized');
  const cleanPhone = phone.replace(/\D/g, '');
  const jid = `${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}@s.whatsapp.net`;
  await sock.sendMessage(jid, { text: message });
}