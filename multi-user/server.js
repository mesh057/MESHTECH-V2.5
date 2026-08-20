const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { MultiUserSessionManager } = require('./session-manager');
const { upgradeUser } = require('../meshtech');

const ADMIN_PASSWORD = process.env.MESHTECH_ADMIN_PASSWORD || 'MESHTECH_ADMIN';
const CUSTOMER_TOKEN_SECRET = process.env.MESHTECH_CUSTOMER_SECRET || process.env.MESHTECH_ADMIN_PASSWORD || 'MESHTECH_ADMIN';
const ADMIN_SESSION_TTL = 8 * 60 * 60 * 1000;
const CUSTOMER_COOKIE_TTL = 30 * 24 * 60 * 60 * 1000;
const adminSessions = new Map();
const adminLoginRate = new Map();

function safeEqualText(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function parseCookies(req) {
  const cookies = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function adminToken(req) {
  const token = parseCookies(req).meshtech_admin;
  if (!token) return null;
  const expiresAt = adminSessions.get(token);
  if (!expiresAt || expiresAt < Date.now()) {
    adminSessions.delete(token);
    return null;
  }
  return token;
}

function requireAdmin(req, res) {
  if (adminToken(req)) return true;
  json(res, 401, { success: false, authenticated: false, error: 'Admin authentication required.' });
  return false;
}

function loginAllowed(ip) {
  const now = Date.now();
  const item = adminLoginRate.get(ip) || { count: 0, reset: now + 15 * 60_000 };
  if (now > item.reset) { item.count = 0; item.reset = now + 15 * 60_000; }
  item.count += 1;
  adminLoginRate.set(ip, item);
  return item.count <= 8;
}

function setAdminCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('set-cookie', `meshtech_admin=${encodeURIComponent(token)}; Max-Age=${ADMIN_SESSION_TTL / 1000}; HttpOnly; SameSite=Lax; Path=/${secure}`);
}

function clearAdminCookie(res) {
  res.setHeader('set-cookie', 'meshtech_admin=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/');
}

function customerCookieValue(number) {
  const phone = String(number || '').replace(/\D/g, '');
  const expiresAt = Date.now() + CUSTOMER_COOKIE_TTL;
  const payload = `${phone}.${expiresAt}`;
  const encoded = Buffer.from(payload).toString('base64url');
  const signature = crypto.createHmac('sha256', CUSTOMER_TOKEN_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function customerPhone(req) {
  const token = parseCookies(req).meshtech_customer;
  if (!token) return null;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;
  const expected = crypto.createHmac('sha256', CUSTOMER_TOKEN_SECRET).update(encoded).digest('base64url');
  if (!safeEqualText(signature, expected)) return null;
  try {
    const [phone, expiresText] = Buffer.from(encoded, 'base64url').toString('utf8').split('.');
    const expiresAt = Number(expiresText);
    if (!/^\d{8,15}$/.test(phone) || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
    return phone;
  } catch (_) {
    return null;
  }
}

function setCustomerCookie(res, number) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const token = customerCookieValue(number);
  res.setHeader('set-cookie', `meshtech_customer=${encodeURIComponent(token)}; Max-Age=${CUSTOMER_COOKIE_TTL / 1000}; HttpOnly; SameSite=Lax; Path=/${secure}`);
}

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

function customerSessionSnapshot(number) {
  const normalized = String(number || '').replace(/\D/g, '');
  if (!normalized) return null;
  const restorable = manager.listRestorableSessions();
  const active = manager.list().find((item) => item.number === normalized);
  const isRestorable = restorable.includes(normalized);
  if (!active && !isRestorable) return null;
  const status = active ? active.status : 'registered';
  return {
    number: normalized,
    status,
    active: Boolean(active),
    restorable: isRestorable,
    relinkRequired: ['error', 'stopped', 'registered'].includes(status),
    pid: active ? active.pid : null,
  };
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
    if (req.method === 'GET' && url.pathname === '/health') {
      const active = manager.list();
      const connected = active.filter((item) => item.status === 'running').length;
      return json(res, 200, {
        status: 'alive',
        multiUser: true,
        active: active.length,
        connected,
        whatsapp: connected > 0 ? 'connected' : 'not_connected',
        persistentAuth: manager.usingPersistentPath,
        uptime: process.uptime(),
      });
    }

    if (req.method === 'GET' && url.pathname === '/api/status') {
      const active = manager.list();
      const connected = active.filter((item) => item.status === 'running').length;
      const botStatus = connected > 0 ? 'connected' : (active.length ? 'reconnecting' : 'waiting');
      return json(res, 200, {
        ok: true,
        multiUser: true,
        // Never expose phone numbers, access tokens, PIDs, or auth paths publicly.
        botStatus,
        totalActive: active.length,
        connected,
        registered: connected > 0,
        persistentAuth: manager.usingPersistentPath,
      });
    }

    if (req.method === 'POST' && url.pathname === '/api/admin/login') {
      if (!loginAllowed(ip)) return json(res, 429, { success: false, error: 'Too many admin login attempts. Try again in 15 minutes.' });
      const data = await readBody(req, 20_000);
      if (!safeEqualText(data.password, ADMIN_PASSWORD)) return json(res, 401, { success: false, authenticated: false, error: 'Incorrect admin password.' });
      const token = crypto.randomBytes(32).toString('hex');
      adminSessions.set(token, Date.now() + ADMIN_SESSION_TTL);
      setAdminCookie(res, token);
      return json(res, 200, { success: true, authenticated: true, expiresIn: ADMIN_SESSION_TTL });
    }

    if (req.method === 'GET' && url.pathname === '/api/admin/status') {
      return json(res, 200, { success: true, authenticated: Boolean(adminToken(req)) });
    }

    if (req.method === 'GET' && url.pathname === '/api/customer/session') {
      const number = customerPhone(req);
      if (!number) return json(res, 200, { success: true, authenticated: false, session: null });
      return json(res, 200, {
        success: true,
        authenticated: true,
        phoneNumber: number,
        session: customerSessionSnapshot(number),
      });
    }

    if (req.method === 'POST' && url.pathname === '/api/admin/logout') {
      const token = adminToken(req);
      if (token) adminSessions.delete(token);
      clearAdminCookie(res);
      return json(res, 200, { success: true, authenticated: false });
    }

    if (req.method === 'GET' && url.pathname === '/api/sessions') {
      const isAdmin = Boolean(adminToken(req));
      const requestedNumber = String(url.searchParams.get('phoneNumber') || '').replace(/\D/g, '');

      if (!isAdmin) {
        // Customer view: the signed cookie is the ownership proof.
        const ownedNumber = customerPhone(req);
        if (!requestedNumber || !ownedNumber || ownedNumber !== requestedNumber) {
          return json(res, 403, { success: false, sessions: [], error: 'Enter the number used in this browser session.' });
        }
        const restorable = manager.listRestorableSessions();
        const activeList = manager.list();
        const isRestorable = restorable.includes(requestedNumber);
        const active = activeList.find(s => s.number === requestedNumber);
        const exists = isRestorable || Boolean(active);
        const sessions = exists ? [{
          number: requestedNumber,
          status: active ? active.status : (isRestorable ? 'registered' : 'idle'),
          active: Boolean(active),
          restorable: isRestorable,
          pid: active ? active.pid : null,
        }] : [];
        return json(res, 200, { success: true, sessions });
      }

      // Owner/Admin view: return all sessions
      const restorable = manager.listRestorableSessions();
      const activeList = manager.list();
      const allNumbers = Array.from(new Set([...restorable, ...activeList.map(s => s.number)]));
      const sessions = allNumbers.map(num => {
        const active = activeList.find(s => s.number === num);
        const isRestorable = restorable.includes(num);
        return {
          number: num,
          status: active ? active.status : (isRestorable ? 'registered' : 'idle'),
          active: Boolean(active),
          restorable: isRestorable,
          pid: active ? active.pid : null,
        };
      });
      return json(res, 200, { success: true, sessions, isAdmin: true });
    }

    if (req.method === 'POST' && url.pathname === '/api/request-pairing') {
      if (!allowed(ip)) return json(res, 429, { success: false, error: 'Too many requests. Try again later.' });
      const data = await readBody(req);
      if (!manager.hasSessionCapacity(data.phoneNumber)) return json(res, 429, { success: false, error: `Maximum active sessions reached (${manager.maxInstances}).` });
      const session = await manager.start(data.phoneNumber, data.useQr === true, false, '', data.force === true);
      setCustomerCookie(res, session.number);
      return json(res, 200, { success: true, message: 'Session started. Poll /api/pairing-code for the code or QR.', phoneNumber: session.number, accessToken: session.accessToken, customerNumber: session.number });
    }

    if (req.method === 'POST' && url.pathname === '/api/clear-session') {
      if (!allowed(ip)) return json(res, 429, { success: false, error: 'Too many requests. Try again later.' });
      const data = await readBody(req);
      const phoneNumber = String(data.phoneNumber || '').replace(/\D/g, '');
      if (!phoneNumber) return json(res, 400, { success: false, error: 'Phone number is required.' });
      
      const isAdmin = Boolean(adminToken(req));
      if (!isAdmin && customerPhone(req) !== phoneNumber) {
        return json(res, 403, { success: false, error: 'Unauthorized. You can only delete your own saved session.' });
      }

      const success = await manager.clear(phoneNumber);
      return json(res, 200, { success, message: success ? 'Session cleared successfully.' : 'Failed to clear session.' });
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
      if (manager.get(phoneNumber)) await manager.stopAndWait(phoneNumber);

      const importedMeshTechSession = /^MeshTech~.+/i.test(sessionText) ? sessionText : '';
      if (!importedMeshTechSession) writeRawCredentials(authDir, sessionText);
      const session = await manager.start(phoneNumber, false, true, importedMeshTechSession);
      setCustomerCookie(res, session.number);
      return json(res, 200, { success: true, message: 'Session restored successfully!', phoneNumber, status: session.status, accessToken: session.accessToken, customerNumber: session.number });
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

    if (req.method === 'GET' && url.pathname === '/api/export-saved-session') {
      const isAdmin = Boolean(adminToken(req));
      const requestedNumber = String(url.searchParams.get('phoneNumber') || '').replace(/\D/g, '');
      const ownedNumber = customerPhone(req);
      const number = isAdmin ? (requestedNumber || ownedNumber) : ownedNumber;
      
      if (!number || (!isAdmin && requestedNumber && requestedNumber !== ownedNumber)) {
        return json(res, 403, { success: false, error: 'Unauthorized.' });
      }

      const authDir = path.join(manager.sessionDir(number), 'auth_info');
      if (!fs.existsSync(authDir)) return json(res, 404, { success: false, error: 'No saved session found.' });
      const sessionId = createMeshTechSessionId(authDir);
      if (!sessionId) return json(res, 500, { success: false, error: 'Could not export credentials.' });
      return json(res, 200, { success: true, sessionId, phoneNumber: number });
    }

    if (req.method === 'POST' && url.pathname === '/api/start-session') {
      const isAdmin = Boolean(adminToken(req));
      const data = await readBody(req);
      const requestedNumber = String(data.phoneNumber || '').replace(/\D/g, '');
      const ownedNumber = customerPhone(req);
      const number = isAdmin ? (requestedNumber || ownedNumber) : ownedNumber;

      if (!number || (!isAdmin && requestedNumber && requestedNumber !== ownedNumber)) {
        return json(res, 403, { success: false, error: 'Unauthorized.' });
      }

      const session = await manager.start(number, false, true);
      return json(res, 200, { success: true, message: 'Session starting...', phoneNumber: number, status: session.status });
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
      await manager.stopAndWait(data.phoneNumber);
      return json(res, 200, { success: true, message: 'User session stopped.' });
    }

    if (req.method === 'POST' && url.pathname === '/api/payments/courtneytech') {
      const signature = req.headers['x-courtney-signature'] || req.headers['x-signature'] || '';
      const secret = process.env.COURTNEY_SECRET_KEY || '';
      
      const rawBody = await new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => resolve(body));
      });
      
      let data;
      try {
        data = JSON.parse(rawBody);
      } catch (e) {
        return json(res, 400, { success: false, error: 'Invalid JSON payload.' });
      }

      // If secret is set, verify HMAC signature if provided by Courtney Tech
      if (secret && signature) {
        const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
        if (hash !== signature) {
          console.warn('[PAYMENT] Invalid webhook signature received.');
          return json(res, 403, { success: false, error: 'Invalid signature.' });
        }
      }

      console.log('[PAYMENT] Webhook received & verified:', data);
      const { phone, amount, status, transaction_id } = data;
      
      if (status === 'success' || status === 'completed') {
          const jid = phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
          const numAmount = Number(amount) || 70;
          let days = 35; // Default (Starter)
          if (numAmount >= 800) days = 365;
          else if (numAmount >= 400) days = 180;
          else if (numAmount >= 300) days = 150;
          else if (numAmount >= 200) days = 90;
          else if (numAmount >= 130) days = 60;
          else days = 35;
          
          await upgradeUser(jid, days);
          console.log(`[PAYMENT] Upgraded ${jid} for ${days} days.`);
          return json(res, 200, { success: true, message: 'Payment processed and user upgraded.' });
      }
      
      return json(res, 400, { success: false, error: 'Invalid payment status.' });
    }

    return json(res, 404, { success: false, error: 'Not found.' });
  } catch (error) {
    return json(res, 400, { success: false, error: error.message });
  }
});

let shuttingDown = false;
setInterval(() => {
  const now = Date.now();
  for (const [token, expiresAt] of adminSessions) {
    if (expiresAt < now) adminSessions.delete(token);
  }
}, 15 * 60_000).unref();

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[mesh-multi-user] ${signal} received; stopping child sessions safely.`);
  await Promise.all(manager.list().map((session) => manager.stopAndWait(session.number)));
  await new Promise((resolve) => server.close(() => resolve()));
  process.exit(0);
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

async function startServer() {
  console.log(`[mesh-multi-user] Auth root: ${manager.rootDir}`);
  if (!manager.usingPersistentPath) {
    console.warn('[mesh-multi-user] Persistent storage is not configured; updates can remove WhatsApp auth state.');
  }
  const restorable = manager.listRestorableSessions();
  const restored = await manager.restoreSavedSessions();
  console.log(`[mesh-multi-user] Found ${restorable.length} registered session(s); restored ${restored.length}.`);
  server.listen(port, '0.0.0.0', () => console.log(`[mesh-multi-user] MESHTECH MD BOT v2.5 listening on ${port}`));
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('[mesh-multi-user] Failed to start:', error);
    process.exitCode = 1;
  });
}

module.exports = { server, manager, startServer };
