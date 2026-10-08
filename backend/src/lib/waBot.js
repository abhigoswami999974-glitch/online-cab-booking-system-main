import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';

let sock = null;

export async function initWhatsAppBot() {
  const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log('\n================ WHATSAPP QR CODE ================');
      qrcode.generate(qr, { small: true });
      console.log('Apne WhatsApp se is QR code ko scan karein!\n');
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('[waBot] Connection closed, reconnecting:', shouldReconnect);
      if (shouldReconnect) {
        initWhatsAppBot();
      }
    } else if (connection === 'open') {
      console.log('[waBot] WhatsApp successfully connected! ✅');
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

export async function sendWhatsAppMessage(phone, message) {
  if (!sock) {
    throw new Error('WhatsApp bot is not initialized');
  }
  const cleanPhone = phone.replace(/\D/g, '');
  const jid = `${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}@s.whatsapp.net`;
  await sock.sendMessage(jid, { text: message });
}