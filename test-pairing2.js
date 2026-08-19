const { default: makeWASocket, useMultiFileAuthState } = require('mesh-baileys');
const pino = require('pino');

async function test() {
  const { state, saveCreds } = await useMultiFileAuthState('/tmp/test-baileys-auth2');
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection } = update;
    console.log('Connection update:', update);
    if (connection === 'open') {
      try {
        console.log('Requesting pairing code after open...');
        const code = await sock.requestPairingCode('254746844168');
        console.log('PAIRING_CODE:', code);
      } catch (e) {
        console.error('Pairing error after open:', e);
      }
    }
  });

  // Also try calling it after 2 seconds if ws is open
  setTimeout(async () => {
    try {
      console.log('Requesting pairing code after 2s timeout...');
      const code = await sock.requestPairingCode('254746844168');
      console.log('PAIRING_CODE after 2s:', code);
    } catch (e) {
      console.error('Pairing error after 2s:', e.message);
    }
  }, 2000);
}

test().catch(console.error);
