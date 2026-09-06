const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  'mesh-baileys',
  'lib',
  'Utils',
  'validate-connection.js'
);

if (!fs.existsSync(target)) {
  console.log('[meshtech] mesh-baileys is not installed; skipping platform compatibility patch.');
  process.exit(0);
}

const source = fs.readFileSync(target, 'utf8');
const oldText = 'platform: WAProto_1.proto.ClientPayload.UserAgent.Platform.MACOS,';
const newText = 'platform: WAProto_1.proto.ClientPayload.UserAgent.Platform.WEB,';

if (source.includes(newText)) {
  console.log('[meshtech] mesh-baileys Web platform identity already applied.');
  process.exit(0);
}

if (!source.includes(oldText)) {
  console.error('[meshtech] Could not find the expected mesh-baileys MACOS platform line; refusing an unsafe patch.');
  process.exit(1);
}

fs.writeFileSync(target, source.replace(oldText, newText));
console.log('[meshtech] Applied mesh-baileys Web platform identity for WhatsApp device linking.');
