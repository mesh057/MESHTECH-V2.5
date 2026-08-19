const { default: makeWASocket, useMultiFileAuthState } = require('mesh-baileys');
const pino = require('pino');

async function test() {
  const { state, saveCreds } = await useMultiFileAuthState('/tmp/test-baileys-auth');
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    console.log('Connection update:', update);
    if (connection === 'connecting') {
      try {
        console.log('Requesting pairing code for 254746844168...');
        const code = await sock.requestPairingCode('254746844168');
        console.log('PAIRING_CODE:', code);
      } catch (e) {
        console.error('Pairing error:', e);
      }
    }
  });
}

test().catch(console.error);
