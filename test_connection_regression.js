const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = __dirname;
const syntaxTargets = [
  'index.js',
  'multi-user/server.js',
  'meshtech/connection/serializer.js',
  'meshtech/connection/connectionHandler.js',
];

for (const relativePath of syntaxTargets) {
  execFileSync(process.execPath, ['--check', path.join(root, relativePath)], { stdio: 'pipe' });
}

const indexSource = fs.readFileSync(path.join(root, 'index.js'), 'utf8');
assert.match(
  indexSource,
  /String\(effectiveSettings\.STARTING_MESSAGE\)\.toLowerCase\(\) !== "false"/,
  'connection notice must remain enabled unless explicitly disabled',
);
assert.match(
  indexSource,
  /const ownerJid = standardizeJid\(MeshTech\?\.user\?\.id\)/,
  'connection notice must use a normalized owner JID',
);
assert.match(
  indexSource,
  /await MeshTech\.sendMessage\(ownerJid, \{ text: connectionMsg \}\)/,
  'connection notice must have a plain-text fallback',
);

async function testSerializer() {
  const { serializeMessage } = require('./meshtech/connection/serializer');
  const socket = { user: { id: '254746844168:1@s.whatsapp.net', name: 'MeshTech' } };
  const settings = { PREFIX: '.' };

  const direct = await serializeMessage(
    {
      key: {
        remoteJid: '254700000001@s.whatsapp.net',
        fromMe: false,
        id: 'direct-test',
      },
      message: { conversation: '.ping' },
      pushName: 'Test User',
    },
    socket,
    settings,
  );
  assert.strictEqual(direct.isCommand, true);
  assert.strictEqual(direct.command, 'ping');
  assert.strictEqual(direct.from, '254700000001@s.whatsapp.net');

  const group = await serializeMessage(
    {
      key: {
        remoteJid: '120363000000000000@g.us',
        participant: '254700000002@s.whatsapp.net',
        fromMe: false,
        id: 'group-test',
      },
      message: { extendedTextMessage: { text: '.menu' } },
      pushName: 'Group User',
    },
    socket,
    settings,
  );
  assert.strictEqual(group.isGroup, true);
  assert.strictEqual(group.isCommand, true);
  assert.strictEqual(group.command, 'menu');
  assert.strictEqual(group.sender, '254700000002@s.whatsapp.net');
}

testSerializer()
  .then(() => {
    console.log('connection-regression-ok');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
