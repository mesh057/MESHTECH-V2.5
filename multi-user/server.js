const http = require('http');
const fs = require('fs');
const path = require('path');
const { MultiUserSessionManager } = require('./session-manager');
const { createMeshTechSessionId } = require('../meshtech/sessionId');

const manager = new MultiUserSessionManager();
const port = Number(process.env.MULTI_USER_PORT || process.env.PORT || 5000);
const rate = new Map();

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  });
  res.end(body);
}

function page(res, fileName) {
  const filePath = path.join(__dirname, fileName);
  if (!fs.existsSync(filePath)) return json(res, 404, { success: false, error: 'Page not found.' });
  const body = fs.readFileSync(filePath);
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end(body);
}

function allowed(ip) {
  const now = Date.now();
  const item = rate.get(ip) || { count: 0, reset: now + 60_000 };
  if (now > item.reset) { item.count = 0; item.reset = now + 60_000; }
  item.count += 1;
  rate.set(ip, item);
  return item.count <= 10;
}

async function readBody(req, maxLength = 4_500_000) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > maxLength) throw new Error('Request body is too large.');
  }
  return raw ? JSON.parse(raw) : {};
}

function normalizeSessionText(value) {
  return String(value || '').trim();
}

function writeRawCredentials(authDir, sessionText) {
  let rawJson = sessionText;
  if (!sessionText.startsWith('{')) {
    try {
      const cleanB64 = sessionText.replace(/^MESH_TECH_/, '');
      rawJson = Buffer.from(cleanB64, 'base64').toString('utf8');
    } catch (_) {}
  }

  try {
    const parsed = JSON.parse(rawJson);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const entries = Object.entries(parsed);
      if (entries.some(([name]) => name === 'creds.json' || name.endsWith('.json'))) {
        for (const [fileName, content] of entries) {
          fs.writeFileSync(path.join(authDir, path.basename(fileName)), typeof content === 'string' ? content : JSON.stringify(content, null, 2));
        }
      } else {
        fs.writeFileSync(path.join(authDir, 'creds.json'), JSON.stringify(parsed, null, 2));
      }
    } else {
      fs.writeFileSync(path.join(authDir, 'creds.json'), rawJson);
    }
  } catch (_) {
    fs.writeFileSync(path.join(authDir, 'creds.json'), rawJson);
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const ip = req.socket.remoteAddress || 'unknown';

    if (req.method === 'GET' && url.pathname === '/') return page(res, 'pairing.html');
    if (req.method === 'GET' && (url.pathname === '/dashboard' || url.pathname === '/dashboard.html')) return page(res, 'dashboard.html');
    if (req.method === 'GET' && url.pathname === '/pairing.html') return page(res, 'pairing.html');
    if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { status: 'alive', multiUser: true, active: manager.count(), uptime: process.uptime() });

    if (req.method === 'GET' && url.pathname === '/api/status') {
      const active = manager.list();
      return json(res, 200, { ok: true, multiUser: true, active, botStatus: active.length ? 'initialized' : 'waiting', totalActive: active.length, registered: active.some((item) => item.status === 'running') });
    }

    if (req.method === 'POST' && url.pathname === '/api/request-pairing') {
      if (!allowed(ip)) return json(res, 429, { success: false, error: 'Too many requests. Try again later.' });
      const data = await readBody(req);
      if (!manager.hasSessionCapacity(data.phoneNumber)) return json(res, 429, { success: false, error: `Maximum active sessions reached (${manager.maxInstances}).` });
      const session = await manager.start(data.phoneNumber, data.useQr === true);
      return json(res, 200, { success: true, message: 'Session started. Poll /api/pairing-code for the code or QR.', phoneNumber: session.number, accessToken: session.accessToken });
    }

    if (req.method === 'POST' && url.pathname === '/api/restore-session') {
      if (!allowed(ip)) return json(res, 429, { success: false, error: 'Too many requests. Try again later.' });
      const data = await readBody(req);
      const phoneNumber = String(data.phoneNumber || '').replace(/\D/g, '');
      const sessionText = normalizeSessionText(data.sessionId);
      if (!phoneNumber || !sessionText) return json(res, 400, { success: false, error: 'Phone number and session ID are required.' });
      if (!manager.hasSessionCapacity(phoneNumber)) return json(res, 429, { success: false, error: `Maximum active sessions reached (${manager.maxInstances}).` });

      const authDir = path.join(manager.sessionDir(phoneNumber), 'auth_info');
      fs.mkdirSync(authDir, { recursive: true });
      if (manager.get(phoneNumber)) manager.stop(phoneNumber);

      const importedMeshTechSession = /^(?:MESH-TECH-MD:~|MeshTech~).+/i.test(sessionText) ? sessionText : '';
      if (!importedMeshTechSession) writeRawCredentials(authDir, sessionText);
      const session = await manager.start(phoneNumber, false, true, importedMeshTechSession);
      return json(res, 200, { success: true, message: 'Session restored successfully!', phoneNumber, status: session.status });
    }

    if (req.method === 'GET' && url.pathname === '/api/session-id') {
      const number = url.searchParams.get('phoneNumber');
      const token = url.searchParams.get('accessToken');
      const session = manager.get(number);
      if (!session || session.accessToken !== token) return json(res, 403, { success: false, error: 'Invalid or expired session token.' });
      if (session.status !== 'running') return json(res, 409, { success: false, error: 'Session is not fully connected yet. Pair the account first and try again.' });
      const sessionId = createMeshTechSessionId(path.join(session.authDir, 'auth_info'));
      if (!sessionId) return json(res, 404, { success: false, error: 'Persistent credentials are not available yet. Wait for the account to connect.' });
      return json(res, 200, { success: true, sessionId, phoneNumber: session.number, warning: 'Treat this session ID like a password. Never post it in chats or public logs.' });
    }

    if (req.method === 'GET' && url.pathname === '/api/pairing-code') {
      const number = url.searchParams.get('phoneNumber');
      const token = url.searchParams.get('accessToken');
      const session = manager.get(number);
      if (!session || session.accessToken !== token) return json(res, 403, { success: false, error: 'Invalid or expired session token.' });
      return json(res, 200, { success: true, status: session.status, code: session.code, qr: session.qr, error: session.error || null, phoneNumber: session.number, pid: session.pid });
    }

    if (req.method === 'POST' && url.pathname === '/api/stop') {
      const data = await readBody(req);
      const session = manager.get(data.phoneNumber);
      if (!session || session.accessToken !== data.accessToken) return json(res, 403, { success: false, error: 'Invalid session token.' });
      manager.stop(data.phoneNumber);
      return json(res, 200, { success: true, message: 'User session stopped.' });
    }

    return json(res, 404, { success: false, error: 'Not found.' });
  } catch (error) {
    return json(res, 400, { success: false, error: error.message });
  }
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[mesh-multi-user] ${signal} received; stopping child sessions safely.`);
  for (const session of manager.list()) {
    manager.stop(session.number);
  }
  await new Promise((resolve) => server.close(() => resolve()));
  process.exit(0);
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

async function startServer() {
  const restored = await manager.restoreSavedSessions();
  if (restored.length) console.log(`[mesh-multi-user] Restoring ${restored.length} saved WhatsApp session(s).`);
  server.listen(port, '0.0.0.0', () => console.log(`[mesh-multi-user] MESHTECH MD BOT v2.5 listening on ${port}`));
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('[mesh-multi-user] Failed to start:', error);
    process.exitCode = 1;
  });
}

module.exports = { server, manager, startServer };
