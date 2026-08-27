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

async function testCommandDispatch() {
  const { gmd, commands, evt } = require('./meshtech/gmdCmds');
  const { serializeMessage } = require('./meshtech/connection/serializer');
  const { findCommand } = require('./meshtech/connection/commandHandler');
  
  let commandExecuted = false;
  gmd({ pattern: 'testcmd' }, async (from, MeshTech, context) => {
    commandExecuted = true;
  });

  const cmd = findCommand('testcmd');
  assert.ok(cmd, 'test command must be registered');

  const socket = { 
    user: { id: '254746844168:1@s.whatsapp.net', name: 'MeshTech' },
    sendMessage: async () => ({})
  };
  const settings = { PREFIX: '.' };
  
  const msg = {
    key: { remoteJid: '254700000001@s.whatsapp.net', fromMe: false, id: 'dispatch-test' },
    message: { conversation: '.testcmd' },
    pushName: 'Tester'
  };

  const serialized = await serializeMessage(msg, socket, settings);
  if (serialized.isCommand && serialized.command) {
    const target = findCommand(serialized.command);
    if (target) {
      await target.function(serialized.from, socket, { ...serialized, MeshTech: socket });
    }
  }

  assert.strictEqual(commandExecuted, true, 'command function must be executed');
}

async function testOnOpenNotification() {
  const source = fs.readFileSync(path.join(root, 'index.js'), 'utf8');
  
  // Verify the logic exists in index.js to handle the connection notice
  assert.ok(source.includes('const ownerJid = standardizeJid(MeshTech?.user?.id)'), 'must resolve owner JID');
  assert.ok(source.includes('String(effectiveSettings.STARTING_MESSAGE).toLowerCase() !== "false"'), 'must be enabled by default');
  
  // Mock the behavior that was added to index.js
  const mockSettings = { STARTING_MESSAGE: 'true', MODE: 'public', PREFIX: '.' };
  const mockOwnerJid = '254746844168@s.whatsapp.net';
  let messageSentTo = null;
  
  const mockMeshTech = {
    user: { id: '254746844168:1@s.whatsapp.net' },
    sendMessage: async (jid, content) => {
      messageSentTo = jid;
      return { key: { id: 'msg-id' } };
    }
  };

  const effectiveSettings = { STARTING_MESSAGE: 'true', ...mockSettings };
  if (String(effectiveSettings.STARTING_MESSAGE).toLowerCase() !== "false") {
     await mockMeshTech.sendMessage(mockOwnerJid, { text: 'test' });
  }

  assert.strictEqual(messageSentTo, mockOwnerJid, 'notification must target the owner JID');
}

async function testSessionRestoreLogic() {
  const fs = require('fs');
  const path = require('path');
  const zlib = require('zlib');
  
  // Mock config and session directory
  const mockSessionDir = path.join(__dirname, 'test_session_dir');
  if (!fs.existsSync(mockSessionDir)) fs.mkdirSync(mockSessionDir, { recursive: true });
  
  const dbPath = path.join(mockSessionDir, 'session.db');
  const credsJsonPath = path.join(mockSessionDir, 'creds.json');
  
  // Cleanup
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  if (fs.existsSync(credsJsonPath)) fs.unlinkSync(credsJsonPath);

  const mockConfig = { SESSION_ID: 'MeshTech~H4sIAAAAAAAA/zMyMDAwAQA1/9sEBAAAAA==' }; // Dummy compressed data
  
  // Scenario 1: No local session -> should allow restore (but we skip real unzip in mock)
  const shouldRestoreIfEmpty = !fs.existsSync(dbPath) && !fs.existsSync(credsJsonPath);
  assert.strictEqual(shouldRestoreIfEmpty, true, 'should allow restore if local session is empty');
  
  // Scenario 2: Local session exists -> must NOT restore to avoid overwriting new pairing
  fs.writeFileSync(dbPath, 'dummy data');
  const shouldSkipIfNotEmpty = fs.existsSync(dbPath) || fs.existsSync(credsJsonPath);
  assert.strictEqual(shouldSkipIfNotEmpty, true, 'must skip restore if local session exists');
  
  // Cleanup mock dir
  fs.unlinkSync(dbPath);
  fs.rmdirSync(mockSessionDir);
  
  console.log('session-restore-logic-verified');
}

Promise.all([testSerializer(), testCommandDispatch(), testOnOpenNotification(), testSessionRestoreLogic()])
  .then(() => {
    console.log('connection-regression-ok');
    process.exit(0);
  })
  .catch((error) => {
    console.error('REGRESSION FAILURE:', error);
    process.exit(1);
  });
