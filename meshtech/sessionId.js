const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function readPersistedCredentials(authInfoDir) {
  const credsPath = path.join(authInfoDir, 'creds.json');
  if (fs.existsSync(credsPath)) {
    const raw = fs.readFileSync(credsPath);
    if (raw.length) return raw;
  }

  const dbPath = path.join(authInfoDir, 'session.db');
  if (!fs.existsSync(dbPath)) return null;

  let db;
  try {
    const Database = require('better-sqlite3');
    db = new Database(dbPath, { readonly: true });
    const row = db.prepare('SELECT value FROM session WHERE id = ?').get('creds');
    return row?.value ? Buffer.from(row.value, 'utf8') : null;
  } finally {
    if (db) db.close();
  }
}

function createMeshTechSessionId(authInfoDir) {
  const raw = readPersistedCredentials(authInfoDir);
  if (!raw || !raw.length) return null;
  return `MeshTech~${zlib.gzipSync(raw).toString('base64')}`;
}

module.exports = { readPersistedCredentials, createMeshTechSessionId };
