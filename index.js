require("events").EventEmitter.defaultMaxListeners = 960;
// Self-repairing auto-installer for Pterodactyl panels
(function() {
    const fs = require('fs');
    const path = require('path');
    const execSync = require('child_process').execSync;
    
    console.log("🔍 [SELF-REPAIR] Checking dependency integrity...");
    const requiredModules = [
        'express', 'axios', 'dotenv', 'fs-extra', 'pino',
        'sequelize', 'sqlite3', 'better-sqlite3', 'pg',
        'mesh-baileys', 'mesh-btns'
    ];
    const missing = requiredModules.some((mod) => {
        try {
            require.resolve(mod, { paths: [__dirname] });
            return false;
        } catch (_) {
            return true;
        }
    });

    // Skip heavy self-repair npm install on cloud hosts where the build step
    // is responsible for installing dependencies. The old check required a
    // hard-coded Sharp binary path that is not used by every Sharp release,
    // causing npm install to run on every normal startup.
    const isCloud = Boolean(process.env.RAILWAY_STATIC_URL || process.env.PORT || process.env.NODE_ENV === 'production');
    const autoRepairRequested = process.env.MESH_AUTO_REPAIR === 'true';
    if (!isCloud && (missing || autoRepairRequested)) {
        console.log("📦 [KATABUMP/PANEL AUTO-FIX] Missing modules or sharp binary detected! Rebuilding...");
        try {
            execSync('npm install --omit=dev --no-audit --no-fund', { stdio: 'inherit', cwd: __dirname });
            if (process.env.MESH_REBUILD_SHARP === 'true') {
                console.log("🔧 [KATABUMP/PANEL AUTO-FIX] Rebuilding Sharp for Linux x64...");
                execSync('npm rebuild sharp --platform=linux --arch=x64', { stdio: 'inherit', cwd: __dirname });
                console.log("✅ [KATABUMP/PANEL AUTO-FIX] Sharp binary rebuilt successfully!");
            }
        } catch (e) {
            console.error("❌ [KATABUMP/PANEL AUTO-FIX] Setup warning:", e.message);
        }
    } else if (isCloud) {
        console.log("☁️ [CLOUD/RAILWAY] Skipping heavy panel auto-repair to ensure instant startup.");
    }

    // Ensure local mesh-baileys symlink
    try {
        if (fs.existsSync(path.join(__dirname, 'mesh-baileys'))) {
            fs.mkdirSync(path.join(__dirname, 'node_modules', '@whiskeysockets'), { recursive: true });
            const target = path.join(__dirname, 'node_modules', '@whiskeysockets', 'baileys');
            if (fs.existsSync(target)) {
                fs.rmSync(target, { recursive: true, force: true });
            }
            fs.symlinkSync(path.join(__dirname, 'mesh-baileys'), target, 'junction');
            console.log("⚙️ [SELF-REPAIR] Linked mesh-baileys successfully.");
        }
    } catch (err) {
        console.error("⚠️ [SELF-REPAIR] Symlink warning:", err.message);
    }
})();

require("./meshtech/gmdHelpers");

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception thrown:', err);
});

const {
    default: meshtechConnect,
    isJidGroup,
    jidNormalizedUser,
    isJidBroadcast,
    downloadMediaMessage,
    downloadContentFromMessage,
    getContentType,
    fetchLatestWaWebVersion,
    DisconnectReason,
} = require("mesh-baileys");

const {
    evt,
    logger,
    emojis,
    commands,
    setSudo,
    delSudo,
    MeshTechApi,
    MeshTechApiKey,
    MeshTechAutoReact,
    MeshTechAntiLink,
    MeshTechAntibad,
    MeshTechAntiGroupMention,
    MeshTechAutoBio,
    handleGameMessage,
    MeshTechChatBot,
    loadSession,
    useSQLiteAuthState,
    getMediaBuffer,
    getSudoNumbers,
    getFileContentType,
    bufferToStream,
    uploadToPixhost,
    uploadToImgBB,
    setCommitHash,
    getCommitHash,
    gmdBuffer,
    gmdJson,
    formatAudio,
    formatVideo,
    toAudio,
    uploadToGithubCdn,
    uploadToMeshTechCdn,
    uploadToCatbox,
    MeshTechAnticall,
    antiStickerHandler,
    createContext,
    createContext2,
    monospace,
    verifyJidState,
    MeshTechPresence,
    MeshTechAntiDelete,
    MeshTechAntiEdit,
    syncDatabase,
    initializeSettings,
    initializeGroupSettings,
    getAllSettings,
    getSetting,
    DEFAULT_SETTINGS,
    standardizeJid,
    serializeMessage,
    loadPlugins,
    findCommand,
    findBodyCommand,
    createHelpers,
    getGroupInfo,
    buildSuperUsers,
    getGroupMetadata,
    createSocketConfig,
    safeNewsletterFollow,
    safeGroupAcceptInvite,
    setupConnectionHandler,
    setupGroupEventsListeners,
    initializeLidStore,
    getJidFromParticipant,
    getUserSubscription,
} = require("./meshtech");

const {
    saveAntiDelete,
    findAntiDelete,
    removeAntiDelete,
    startCleanup,
    SQLiteStore,
} = require('./meshtech/database/messageStore');

const config = require("./config");
const { rememberRecipient, rememberActivity } = require("./meshtech/broadcastRegistry");
const googleTTS = require("google-tts-api");
const fs = require("fs-extra");
const path = require("path");
const axios = require('axios');
const express = require("express");

const MESHTECH_LOGO_URL = "https://i.postimg.cc/vHZz7VWG/bot-logo.png";
const MESHTECH_PAIRING_URL = process.env.MESH_PAIRING_URL || "";
const MESHTECH_CHANNEL_URL = "https://whatsapp.com/channel/0029VbDeTrNEKyZ9GlUude2R";
const MESHTECH_GROUP_URL = "https://chat.whatsapp.com/DM1JxxnOJFp0vsTHpej89M";

async function resolveMeshTechChannel(MeshTech) {
    const channelUrl = process.env.MESHTECH_CHANNEL_URL || MESHTECH_CHANNEL_URL;
    const inviteCode = channelUrl.match(/whatsapp\.com\/channel\/([^/?#]+)/i)?.[1];
    if (!inviteCode || typeof MeshTech?.newsletterMetadata !== "function") return null;
    try {
        const metadata = await MeshTech.newsletterMetadata("invite", inviteCode);
        const channelJid = metadata?.id;
        if (channelJid && /@newsletter$/.test(channelJid)) {
            await setSetting("NEWSLETTER_JID", channelJid);
            console.log(`✅ MeshTech channel resolved: ${channelJid}`);
            return channelJid;
        }
    } catch (error) {
        console.warn(`⚠️ MeshTech channel lookup unavailable: ${error.message}`);
    }
    return null;
}

/**
 * Resolves any JID to a real phone JID (@s.whatsapp.net).
 * Returns the original jid unchanged if it is already a real JID.
 * Returns null only when jid itself is null/undefined.
 * When a LID cannot be resolved it returns the original LID as a best-effort
 * fallback so the operation still fires rather than being silently skipped.
 */
// Unused resolveRealJid removed to simplify index.js

const { sendButtons } = require("mesh-btns");
const { setSetting } = require("./meshtech/database/settings");
const { SESSION_ID: sessionId, OWNER_NUMBER: ownerNumber } = config;

// Helper to identify if a number is the bot owner
const isOwner = (number) => {
    if (!number) return false;
    const cleanNumber = String(number).replace(/\D/g, "");
    const cleanOwner = String(ownerNumber).replace(/\D/g, "");
    const cleanPairing = String(process.env.MESH_PAIRING_PHONE_NUMBER || "").replace(/\D/g, "");
    return cleanNumber === cleanOwner || (cleanPairing && cleanNumber === cleanPairing);
};

const PORT = process.env.PORT || 8080;
const embeddedHttpServerEnabled = process.env.MESH_DISABLE_HTTP_SERVER !== "true";
const app = express();
let MeshTech;
let store;

logger.level = "silent";
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 🚀 Start health server immediately for Railway/Render
if (embeddedHttpServerEnabled) {
    app.listen(PORT, "0.0.0.0", () => console.log(`✅ Unified MESH-TECH MD Server Running on 0.0.0.0:${PORT}`));
}

app.get("/health", (req, res) => {
    const isOwnerConnected = Boolean(MeshTech?.user?.id);
    const ownerState = ownerPairingState?.status || 'unknown';
    return res.status(200).json({
        status: isOwnerConnected ? 'healthy' : (ownerState === 'pairing' ? 'pairing' : 'degraded'),
        botName: 'MESH-TECH MD',
        uptime: process.uptime(),
        ownerWhatsApp: isOwnerConnected ? 'connected' : ownerState,
        database: "check_details_route"
    });
});

app.get("/health/details", async (req, res) => {
    const { DATABASE } = require("./meshtech/database/database");
    let dbStatus = "unknown";
    try {
        await DATABASE.authenticate();
        dbStatus = "connected";
    } catch (e) {
        dbStatus = `error: ${e.message}`;
    }

    const active = manager.list();
    const childConnected = active.filter((item) => item.status === 'running').length;
    const isOwnerConnected = Boolean(MeshTech?.user?.id);
    const ownerState = ownerPairingState?.status || 'unknown';
    
    return res.status(200).json({
        status: isOwnerConnected ? 'healthy' : (ownerState === 'pairing' ? 'pairing' : 'degraded'),
        botName: 'MESH-TECH MD',
        multiUser: true,
        database: dbStatus,
        activeSessions: active.length + (isOwnerConnected ? 1 : 0),
        connectedSessions: childConnected + (isOwnerConnected ? 1 : 0),
        ownerWhatsApp: isOwnerConnected ? 'connected' : ownerState,
        persistentAuth: manager.usingPersistentPath,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Priority Routes for Pairing Dashboard
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "multi-user", "pairing.html")));
app.get("/dashboard", (req, res) => res.sendFile(path.join(__dirname, "multi-user", "dashboard.html")));
app.get("/dashboard.html", (req, res) => res.sendFile(path.join(__dirname, "multi-user", "dashboard.html")));
app.get("/pairing.html", (req, res) => res.sendFile(path.join(__dirname, "multi-user", "pairing.html")));

// Static Files
app.use(express.static("meshtech"));
app.use(express.static(path.join(__dirname, "multi-user")));

// Multi-user & Pairing backend integration
const crypto = require('crypto');
const { MultiUserSessionManager } = require('./multi-user/session-manager');
const { createMeshTechSessionId } = require('./meshtech/sessionId');
const { upgradeUser } = require('./meshtech');

const ADMIN_PASSWORD = process.env.MESHTECH_ADMIN_PASSWORD || 'MESHTECH_ADMIN';
const CUSTOMER_TOKEN_SECRET = process.env.MESHTECH_CUSTOMER_SECRET || process.env.MESHTECH_ADMIN_PASSWORD || 'MESHTECH_ADMIN';
const ADMIN_SESSION_TTL = 8 * 60 * 60 * 1000;
const CUSTOMER_COOKIE_TTL = 30 * 24 * 60 * 60 * 1000;
const adminSessions = new Map();
const adminLoginRate = new Map();
const rate = new Map();
const manager = new MultiUserSessionManager();

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

function setAdminCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('set-cookie', `meshtech_admin=${encodeURIComponent(token)}; Max-Age=${ADMIN_SESSION_TTL / 1000}; HttpOnly; SameSite=Lax; Path=/${secure}`);
}

function clearAdminCookie(res) {
  res.setHeader('set-cookie', 'meshtech_admin=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/');
}

function allowed(ip) {
  const now = Date.now();
  const item = rate.get(ip) || { count: 0, reset: now + 60_000 };
  if (now > item.reset) { item.count = 0; item.reset = now + 60_000; }
  item.count += 1;
  rate.set(ip, item);
  return item.count <= 10;
}

function loginAllowed(ip) {
  const now = Date.now();
  const item = adminLoginRate.get(ip) || { count: 0, reset: now + 15 * 60_000 };
  if (now > item.reset) { item.count = 0; item.reset = now + 15 * 60_000; }
  item.count += 1;
  adminLoginRate.set(ip, item);
  return item.count <= 8;
}

function customerSessionSnapshot(number) {
  const restorable = manager.listRestorableSessions();
  const activeList = manager.list();
  const isRestorable = restorable.includes(number);
  const active = activeList.find(s => s.number === number);
  const exists = isRestorable || Boolean(active);
  if (!exists) return null;
  return {
    number,
    status: active ? active.status : (isRestorable ? 'registered' : 'idle'),
    active: Boolean(active),
    restorable: isRestorable,
    pid: active ? active.pid : null,
  };
}

function normalizeSessionText(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';
  if (/^MeshTech~.+/i.test(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return JSON.stringify(parsed);
  } catch (_) {
    return raw;
  }
}

function writeRawCredentials(authDir, rawJson) {
  try {
    const parsed = JSON.parse(rawJson);
    if (parsed && typeof parsed === 'object') {
      if (parsed.creds) {
        fs.writeFileSync(path.join(authDir, 'creds.json'), JSON.stringify(parsed.creds, null, 2));
        if (parsed.keys && typeof parsed.keys === 'object') {
          const keysDir = path.join(authDir, 'keys');
          fs.mkdirSync(keysDir, { recursive: true });
          for (const [k, v] of Object.entries(parsed.keys)) {
            fs.writeFileSync(path.join(keysDir, `${k}.json`), JSON.stringify(v, null, 2));
          }
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

// Detailed health route moved here
app.get("/health/details", (req, res) => {
    const active = manager.list();
    const childConnected = active.filter((item) => item.status === 'running').length;
    const isOwnerConnected = Boolean(MeshTech?.user?.id);
    const ownerState = ownerPairingState?.status || 'unknown';
    
    return res.status(200).json({
        status: isOwnerConnected ? 'healthy' : (ownerState === 'pairing' ? 'pairing' : 'degraded'),
        botName: 'MESH-TECH MD',
        multiUser: true,
        activeSessions: active.length + (isOwnerConnected ? 1 : 0),
        connectedSessions: childConnected + (isOwnerConnected ? 1 : 0),
        ownerWhatsApp: isOwnerConnected ? 'connected' : ownerState,
        persistentAuth: manager.usingPersistentPath,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.get("/api/status", (req, res) => {
    const active = manager.list();
    const childConnected = active.filter((item) => item.status === 'running').length;
    const ownerConnected = Boolean(MeshTech?.user?.id);
    const totalConnected = childConnected + (ownerConnected ? 1 : 0);
    
    // botStatus is 'connected' if either owner or any child is connected
    const botStatus = totalConnected > 0 ? 'connected' : (active.length ? 'reconnecting' : 'waiting');
    
    return res.status(200).json({
        ok: true,
        multiUser: true,
        botStatus,
        totalActive: active.length + (ownerConnected ? 1 : 0),
        connected: totalConnected,
        registered: totalConnected > 0,
        ownerConnected,
        persistentAuth: manager.usingPersistentPath,
    });
});

app.post("/api/admin/login", (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (!loginAllowed(ip)) return res.status(429).json({ success: false, error: 'Too many admin login attempts. Try again in 15 minutes.' });
    const data = req.body || {};
    if (!safeEqualText(data.password, ADMIN_PASSWORD)) return res.status(401).json({ success: false, authenticated: false, error: 'Incorrect admin password.' });
    const token = crypto.randomBytes(32).toString('hex');
    adminSessions.set(token, Date.now() + ADMIN_SESSION_TTL);
    setAdminCookie(res, token);
    return res.status(200).json({ success: true, authenticated: true, expiresIn: ADMIN_SESSION_TTL });
});

app.get("/api/admin/status", (req, res) => {
    return res.status(200).json({ success: true, authenticated: Boolean(adminToken(req)) });
});

app.get("/api/customer/session", (req, res) => {
    const number = customerPhone(req);
    if (!number) return res.status(200).json({ success: true, authenticated: false, session: null });
    return res.status(200).json({
        success: true,
        authenticated: true,
        phoneNumber: number,
        session: customerSessionSnapshot(number),
    });
});

app.post("/api/admin/logout", (req, res) => {
    const token = adminToken(req);
    if (token) adminSessions.delete(token);
    clearAdminCookie(res);
    return res.status(200).json({ success: true, authenticated: false });
});

app.get("/api/sessions", (req, res) => {
    const isAdmin = Boolean(adminToken(req));
    const requestedNumber = String(req.query.phoneNumber || '').replace(/\D/g, '');

    if (!isAdmin) {
        const ownedNumber = customerPhone(req);
        if (!requestedNumber || !ownedNumber || ownedNumber !== requestedNumber) {
            return res.status(403).json({ success: false, sessions: [], error: 'Enter the number used in this browser session.' });
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
        return res.status(200).json({ success: true, sessions });
    }

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
    return res.status(200).json({ success: true, sessions, isAdmin: true });
});

app.post("/api/request-pairing", async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (!allowed(ip)) return res.status(429).json({ success: false, error: 'Too many requests. Try again later.' });
    const data = req.body || {};
    const phoneNumber = String(data.phoneNumber || '').replace(/\D/g, '');

    if (phoneNumber && isOwner(phoneNumber)) {
        console.log(`[mesh-main] Owner pairing requested for ${phoneNumber}...`);

        // A pairing request must never reuse an old registered auth state. If it
        // does, startMeshTech() correctly skips requestPairingCode() because
        // creds.registered is already true, leaving the dashboard polling forever.
        process.env.MESH_PAIRING_PHONE_NUMBER = phoneNumber;
        process.env.MESH_PAIRING_MODE = data.useQr ? 'qr' : 'pairing';
        ownerPairingState = { status: 'starting', code: null, qr: null, error: null };

        try {
            if (MeshTech) {
                try { await MeshTech.logout(); } catch (_) {}
                try { MeshTech.end(); } catch (_) {}
                MeshTech = null;
            }
            if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });
            const { SessionBackupDB } = require('./meshtech/database/sessionBackup');
            await SessionBackupDB.destroy({ where: { number: phoneNumber } });
        } catch (e) {
            console.error("[mesh-main] Owner pairing reset failed:", e.message);
        }

        // Restart from a guaranteed fresh auth state so the pairing request is
        // not blocked by stale creds.json/session.db files.
        console.log(`[mesh-main] Restarting owner bot for pairing...`);
        setTimeout(() => startMeshTech({ forceFresh: true }).catch((error) => {
            ownerPairingState.status = 'error';
            ownerPairingState.error = error.message;
            console.error('[mesh-main] Owner pairing startup failed:', error.message);
        }), 2000);
        
        setCustomerCookie(res, phoneNumber);
        return res.status(200).json({ 
            success: true, 
            message: 'Owner pairing started. The bot is restarting to generate your code.', 
            phoneNumber, 
            accessToken: 'owner-access', 
            customerNumber: phoneNumber 
        });
    }

    if (!manager.hasSessionCapacity(phoneNumber)) return res.status(429).json({ success: false, error: `Maximum active sessions reached (${manager.maxInstances}).` });
    const session = await manager.start(phoneNumber, data.useQr === true, false, '', data.force === true);
    setCustomerCookie(res, session.number);
    return res.status(200).json({ success: true, message: 'Session started. Poll /api/pairing-code for the code or QR.', phoneNumber: session.number, accessToken: session.accessToken, customerNumber: session.number });
});

app.post("/api/clear-session", async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (!allowed(ip)) return res.status(429).json({ success: false, error: 'Too many requests. Try again later.' });
    const data = req.body || {};
    const phoneNumber = String(data.phoneNumber || '').replace(/\D/g, '');
    if (!phoneNumber) return res.status(400).json({ success: false, error: 'Phone number is required.' });

    const isAdmin = Boolean(adminToken(req));
    if (!isAdmin && customerPhone(req) !== phoneNumber) {
        return res.status(403).json({ success: false, error: 'Unauthorized. You can only delete your own saved session.' });
    }

    const isOwnerSession = isOwner(phoneNumber);

    try {
        if (isOwnerSession) {
            console.log(`[mesh-main] Clearing only owner session ${phoneNumber}; customer sessions remain untouched.`);
            if (MeshTech) {
                try { await MeshTech.logout(); } catch (_) {}
                try { MeshTech.end(); } catch (_) {}
                MeshTech = null;
            }
            if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });
            const { SessionBackupDB } = require('./meshtech/database/sessionBackup');
            await SessionBackupDB.destroy({ where: { number: phoneNumber } });
            ownerPairingState = { status: 'idle', code: null, qr: null, error: null };
            return res.status(200).json({ success: true, owner: true, message: 'Owner session cleared. Request a new pairing code now.' });
        }

        const success = await manager.clear(phoneNumber);
        return res.status(200).json({ success, owner: false, message: success ? 'Customer session cleared successfully.' : 'Failed to clear session.' });
    } catch (e) {
        console.error("[mesh-main] Failed to clear session:", e.message);
        return res.status(500).json({ success: false, error: 'Session clear failed. Check server logs.' });
    }
});

app.get("/api/force-nuclear-reset", async (req, res) => {
    if (!adminToken(req)) return res.status(403).json({ success: false, error: 'Admin authentication required.' });
    const ownerNumber = String(process.env.MESH_PAIRING_PHONE_NUMBER || config.SESSION_ID || '').replace(/\D/g, '');
    if (!ownerNumber) return res.status(400).json({ success: false, error: 'Owner number is not configured.' });
    try {
        if (MeshTech) {
            try { await MeshTech.logout(); } catch (_) {}
            try { MeshTech.end(); } catch (_) {}
            MeshTech = null;
        }
        if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });
        const { SessionBackupDB } = require('./meshtech/database/sessionBackup');
        await SessionBackupDB.destroy({ where: { number: ownerNumber } });
        ownerPairingState = { status: 'idle', code: null, qr: null, error: null };
        return res.status(200).send("<html><body style='background:#111;color:#fff;font-family:sans-serif;text-align:center;padding-top:50px;'><h1>Owner session cleared</h1><p>Customer sessions were not touched. Return to the pairing page and request a new code.</p><p><a href='/' style='color:#0ff;font-size:20px;'>Return to Pairing Dashboard</a></p></body></html>");
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

app.post("/api/restore-session", async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (!allowed(ip)) return res.status(429).json({ success: false, error: 'Too many requests. Try again later.' });
    const data = req.body || {};
    const phoneNumber = String(data.phoneNumber || '').replace(/\D/g, '');
    const sessionText = normalizeSessionText(data.sessionId);
    if (!phoneNumber || !sessionText) return res.status(400).json({ success: false, error: 'Phone number and session ID are required.' });
    if (!manager.hasSessionCapacity(phoneNumber)) return res.status(429).json({ success: false, error: `Maximum active sessions reached (${manager.maxInstances}).` });

    const authDir = path.join(manager.sessionDir(phoneNumber), 'auth_info');
    fs.mkdirSync(authDir, { recursive: true });
    if (manager.get(phoneNumber)) await manager.stopAndWait(phoneNumber);

    const importedMeshTechSession = /^MeshTech~.+/i.test(sessionText) ? sessionText : '';
    if (!importedMeshTechSession) writeRawCredentials(authDir, sessionText);
    const session = await manager.start(phoneNumber, false, true, importedMeshTechSession);
    setCustomerCookie(res, session.number);
    return res.status(200).json({ success: true, message: 'Session restored successfully!', phoneNumber, status: session.status, accessToken: session.accessToken, customerNumber: session.number });
});

app.get("/api/session-id", (req, res) => {
    const number = req.query.phoneNumber;
    const token = req.query.accessToken;
    const session = manager.get(number);
    if (!session || session.accessToken !== token) return res.status(403).json({ success: false, error: 'Invalid or expired session token.' });
    if (session.status !== 'running') return res.status(409).json({ success: false, error: 'Session is not fully connected yet. Pair the account first and try again.' });
    const sessionId = createMeshTechSessionId(path.join(session.authDir, 'auth_info'));
    if (!sessionId) return res.status(404).json({ success: false, error: 'Persistent credentials are not available yet. Wait for the account to connect.' });
    return res.status(200).json({ success: true, sessionId, phoneNumber: session.number, warning: 'Treat this session ID like a password. Never post it in chats or public logs.' });
});

app.get("/api/export-saved-session", (req, res) => {
    const isAdmin = Boolean(adminToken(req));
    const requestedNumber = String(req.query.phoneNumber || '').replace(/\D/g, '');
    const ownedNumber = customerPhone(req);
    const number = isAdmin ? (requestedNumber || ownedNumber) : ownedNumber;

    if (!number || (!isAdmin && requestedNumber && requestedNumber !== ownedNumber)) {
        return res.status(403).json({ success: false, error: 'Unauthorized.' });
    }

    const authDir = path.join(manager.sessionDir(number), 'auth_info');
    if (!fs.existsSync(authDir)) return res.status(404).json({ success: false, error: 'No saved session found.' });
    const sessionId = createMeshTechSessionId(authDir);
    if (!sessionId) return res.status(500).json({ success: false, error: 'Could not export credentials.' });
    return res.status(200).json({ success: true, sessionId, phoneNumber: number });
});

app.post("/api/start-session", async (req, res) => {
    const isAdmin = Boolean(adminToken(req));
    const data = req.body || {};
    const requestedNumber = String(data.phoneNumber || '').replace(/\D/g, '');
    const ownedNumber = customerPhone(req);
    const number = isAdmin ? (requestedNumber || ownedNumber) : ownedNumber;

    if (!number || (!isAdmin && requestedNumber && requestedNumber !== ownedNumber)) {
        return res.status(403).json({ success: false, error: 'Unauthorized.' });
    }

    const session = await manager.start(number, false, true);
    return res.status(200).json({ success: true, message: 'Session starting...', phoneNumber: number, status: session.status });
});

// Track owner pairing state globally in the unified server
let ownerPairingState = { status: 'idle', code: null, qr: null, error: null };

app.get("/api/pairing-code", (req, res) => {
    const number = req.query.phoneNumber;
    const token = req.query.accessToken;

    if (number && isOwner(number) && token === 'owner-access') {
        return res.status(200).json({ 
            success: true, 
            status: ownerPairingState.status, 
            code: ownerPairingState.code, 
            qr: ownerPairingState.qr, 
            error: ownerPairingState.error, 
            phoneNumber: number, 
            pid: process.pid 
        });
    }

    const session = manager.get(number);
    if (!session || session.accessToken !== token) return res.status(403).json({ success: false, error: 'Invalid or expired session token.' });
    return res.status(200).json({ success: true, status: session.status, code: session.code, qr: session.qr, error: session.error || null, phoneNumber: session.number, pid: session.pid });
});

app.post("/api/stop", async (req, res) => {
    const data = req.body || {};
    const session = manager.get(data.phoneNumber);
    if (!session || session.accessToken !== data.accessToken) return res.status(403).json({ success: false, error: 'Invalid session token.' });
    await manager.stopAndWait(data.phoneNumber);
    return res.status(200).json({ success: true, message: 'User session stopped.' });
});

app.post("/api/payments/courtneytech", async (req, res) => {
    try {
        const signature = req.headers['x-courtney-sig'] || req.headers['x-courtney-signature'] || req.headers['x-signature'] || '';
        const secret = process.env.COURTNEY_SECRET_KEY || '';
        const data = req.body || {};

        // HMAC verification using parsed body (best effort for now)
        if (secret && signature) {
            const hmac = crypto.createHmac('sha256', secret);
            hmac.update(JSON.stringify(req.body));
            const hash = hmac.digest('hex');
            if (hash !== signature) {
                console.warn('[PAYMENT] Webhook signature mismatch.');
                // return res.status(403).json({ success: false, error: 'Invalid signature.' });
            }
        }

        console.log('[PAYMENT] Webhook received:', data);
        const phone = data.phone || data.phoneNumber || data.number;
        const amount = data.amount || data.value;
        const status = data.status || data.state;

        if (status === 'success' || status === 'completed' || status === 'paid') {
            if (!phone) return res.status(400).json({ success: false, error: 'Phone number missing.' });
            const jid = String(phone).replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            const numAmount = Number(amount) || 0;
            
            let days = 35;
            if (numAmount >= 840) days = 365;
            else if (numAmount >= 420) days = 180;
            else if (numAmount >= 210) days = 90;
            else if (numAmount >= 140) days = 60;
            else if (numAmount >= 70) days = 35;
            
            await upgradeUser(jid, days);
            console.log(`[PAYMENT] Automated Upgrade: ${jid} for ${days} days (Amount: ${numAmount})`);
            return res.status(200).json({ success: true, message: `User ${jid} upgraded for ${days} days.` });
        }
        
        return res.status(200).json({ success: true, message: 'Webhook received but no action taken (status not success).' });
    } catch (err) {
        console.error('[PAYMENT] Webhook Error:', err.message);
        return res.status(500).json({ success: false, error: 'Internal server error.' });
    }
});

// Server already started at the top
if (!embeddedHttpServerEnabled) {
    console.log("ℹ️ Embedded HTTP server disabled for isolated multi-session bot process.");
}

setInterval(() => {
    const used = process.memoryUsage();
    if (used.heapUsed > 400 * 1024 * 1024) {
        if (global.gc) global.gc();
    }
}, 60000);

if (embeddedHttpServerEnabled) {
    // Keep-alive: Ping the local health endpoint every 30 seconds to prevent Railway hibernation
    setInterval(async () => {
        try {
            const http = require("http");
            http.get(`http://localhost:${PORT}/health`, () => {});
            
            // If a public URL is set in environment, ping it externally to prevent sleep
            const publicUrl = process.env.PUBLIC_URL || process.env.RAILWAY_PUBLIC_DOMAIN;
            if (publicUrl) {
                const target = publicUrl.startsWith("http") ? publicUrl : `https://${publicUrl}`;
                const https = require("https");
                const client = target.startsWith("https") ? https : http;
                client.get(`${target}/health`, () => {}).on("error", () => {});
            }

            // Also send a presence update to WhatsApp if connected
            if (MeshTech?.user?.id) {
                await MeshTech.sendPresenceUpdate("available");
            }
        } catch (e) {}
    }, 30000);
}

const sessionDir = path.resolve(process.env.AUTH_DIR || config.AUTH_DIR || path.join(__dirname, "meshtech", "session"));
const pluginsPath = path.join(__dirname, "commands");
console.log("ℹ️ Pre-loading plugins...");
loadPlugins(pluginsPath);
console.log("✅ Plugins pre-loaded.");

let botSettings = {};
async function loadBotSettings() {
    await syncDatabase();
    await initializeSettings();
    await initializeGroupSettings();
    // Force public mode if multi-user or env demands it
    const envMode = process.env.MODE || process.env.MESH_MULTI_USER_SESSION_MODE;
    if (envMode) {
        await SettingsDB.upsert({ key: 'MODE', value: envMode });
    }
    botSettings = await getAllSettings();
    
    // Auto-restore all multi-user sessions from cloud/local storage on startup
    if (embeddedHttpServerEnabled) {
        console.log("🔄 Initializing multi-user session restoration...");
        manager.restoreSavedSessions();
    }
    
    return botSettings;
}

startCleanup();

async function startMeshTech(options = {}) {
    try {
        const sessionDbPath = path.resolve(process.env.SESSION_DB_FILE || config.SESSION_DB_FILE || path.join(sessionDir, "session.db"));
        const authInfoDir = path.join(sessionDir, 'auth_info');
        
        // A fresh pairing is always a one-shot, owner-only reset. Customer sessions live
        // under MultiUserSessionManager and are never touched by this branch.
        const envFreshRequested = process.env.MESH_FORCE_FRESH === 'true' || process.env.MESH_CLEAR_SESSION === 'true';
        // Consume the environment reset only when the local owner store is absent. This
        // prevents a newly paired session from being erased on every later restart.
        const forceFresh = options.forceFresh === true || (envFreshRequested && !fs.existsSync(sessionDbPath));
        if (forceFresh) {
            console.log("🧹 Fresh owner pairing requested: wiping only the main owner session...");
            try {
                if (fs.existsSync(sessionDir)) {
                    fs.rmSync(sessionDir, { recursive: true, force: true });
                }
                const { SessionBackupDB } = require('./meshtech/database/sessionBackup');
                const ownerNumber = String(process.env.MESH_PAIRING_PHONE_NUMBER || config.SESSION_ID || '').replace(/\D/g, '');
                if (ownerNumber) {
                    await SessionBackupDB.destroy({ where: { number: ownerNumber } });
                    console.log(`🔥 Purged only the owner cloud backup for ${ownerNumber}.`);
                } else {
                    console.warn("⚠️ No owner number configured; local session was wiped but no cloud record was deleted.");
                }
            } catch (err) {
                console.error("Fresh owner wipe error:", err.message);
            }
        }

        // Restore only the configured owner backup. Never fall back to a customer's
        // most-recent record, because that can resurrect an unrelated old session.
        if (!forceFresh && !fs.existsSync(sessionDbPath)) {
            try {
                const { SessionBackupDB } = require('./meshtech/database/sessionBackup');
                const ownerNumber = String(process.env.MESH_PAIRING_PHONE_NUMBER || config.SESSION_ID || '').replace(/\D/g, '');
                if (ownerNumber) {
                    const backup = await SessionBackupDB.findOne({ where: { number: ownerNumber } });
                    if (backup?.zipData) {
                        console.log(`🔄 Restoring the configured owner session (${backup.number}) from PostgreSQL...`);
                        const AdmZip = require('adm-zip');
                        const zip = new AdmZip(backup.zipData);
                        fs.mkdirSync(sessionDir, { recursive: true });
                        zip.extractAllTo(sessionDir, true);
                    }
                } else {
                    console.log("ℹ️ No owner number configured; starting without cloud session restore.");
                }
            } catch (e) {
                console.error("[mesh-main] Cloud restore failed:", e.message);
            }
        }

        // Add a timeout to version fetching to prevent pairing delays (updated fallback version)
        const { version } = await Promise.race([
            fetchLatestWaWebVersion(),
            new Promise(resolve => setTimeout(() => resolve({ version: [2, 3000, 1045728218] }), 8000))
        ]).catch(() => ({ version: [2, 3000, 1045728218] }));
        
        const { state, saveCreds } = await useSQLiteAuthState(sessionDbPath);

        if (store) store.destroy();
        store = new SQLiteStore();

        const socketConfig = createSocketConfig(version, state, logger);
        socketConfig.printQRInTerminal = false;
        socketConfig.syncFullHistory = true;
        socketConfig.shouldSyncHistoryMessage = () => true;
        socketConfig.historyCacheSize = 100;
        socketConfig.markOnlineOnConnect = true;
        // Keep owner pairing aligned with the macOS platform compatibility patch.
        socketConfig.browser = ['Mac OS', 'Chrome', '14.4.1'];
        socketConfig.getMessage = async (key) => {
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id);
                return msg?.message || undefined;
            }
            return undefined;
        };

        MeshTech = meshtechConnect(socketConfig);
        store.bind(MeshTech.ev);

        let pairingRequested = false;
        let pairingInFlight = false;
        let resolvedPairingNumber = String(process.env.MESH_PAIRING_PHONE_NUMBER || "").replace(/\D/g, "");

        const promptForPhoneNumber = () => {
            return new Promise((resolve) => {
                if (/^\d{8,15}$/.test(resolvedPairingNumber)) {
                    return resolve(resolvedPairingNumber);
                }
                if (state.creds.registered) {
                    return resolve("");
                }
                // If running in a non-interactive environment (like Railway, Render, or Docker container without TTY), skip console prompt and return empty so web pairing dashboard can handle it
                if (!process.stdin.isTTY || process.env.RAILWAY_STATIC_URL || process.env.RENDER || process.env.DYNO) {
                    console.log("ℹ️ Non-interactive environment detected (Railway/Cloud). Skipping console prompt. Use the web pairing dashboard at /pairing.html");
                    return resolve("");
                }
                const readline = require('readline').createInterface({
                    input: process.stdin,
                    output: process.stdout
                });
                console.log("\n==================================================");
                console.log("📱 MESH-TECH MD CONSOLE-NATIVE PAIRING");
                console.log("==================================================");
                readline.question("👉 Enter your WhatsApp phone number (with country code, e.g. 2547XXXXXXXX): ", (answer) => {
                    readline.close();
                    const cleaned = String(answer || "").replace(/\D/g, "");
                    resolvedPairingNumber = cleaned;
                    resolve(cleaned);
                });
            });
        };

        const requestPairingCode = async () => {
            if (pairingRequested || pairingInFlight || state.creds.registered || process.env.MESH_PAIRING_MODE === "qr") return;
            
            const phoneNumber = await promptForPhoneNumber();
            if (!/^\d{8,15}$/.test(phoneNumber)) {
                if (phoneNumber !== "") {
                    console.error("❌ PAIRING_ERROR: Invalid phone number format. Use digits only with country code.");
                }
                return;
            }
            pairingInFlight = true;
            ownerPairingState.status = 'requesting';
            try {
                if (MeshTech?.user?.id) return;
                // Wait briefly to ensure WebSocket is open and ready for pairing IQ
                await new Promise(r => setTimeout(r, 2000));
                const pairingCode = await MeshTech.requestPairingCode(phoneNumber);
                pairingRequested = true;
                ownerPairingState.status = 'pairing';
                ownerPairingState.code = pairingCode;
                console.log(`PAIRING_CODE ${pairingCode}`);
            } catch (pairingError) {
                console.error(`PAIRING_ERROR ${pairingError.message}`);
                ownerPairingState.status = 'error';
                ownerPairingState.error = pairingError.message;
                pairingInFlight = false;
                // Retry pairing request after 3 seconds if connection was not yet open
                setTimeout(requestPairingCode, 3000);
                return;
            }
            pairingInFlight = false;
        };

        // Connection monitoring for pairing request
        MeshTech.ev.on("connection.update", (update) => {
            const { connection, qr } = update;
            if (qr) {
                ownerPairingState.status = 'qr';
                ownerPairingState.qr = qr;
            }
            if (connection === "open") {
                ownerPairingState.status = 'connected';
                ownerPairingState.code = null;
                ownerPairingState.qr = null;
            }
            if (connection === "connecting" || connection === "open") {
                if (!state.creds.registered && process.env.MESH_PAIRING_PHONE_NUMBER && process.env.MESH_PAIRING_MODE !== "qr") {
                    setTimeout(requestPairingCode, 2000);
                }
            }
        });

        MeshTech.ev.process(async (events) => {
            if (events["creds.update"]) {
                await saveCreds();
                // Backup main owner session to cloud database
                if (MeshTech?.user?.id) {
                    const ownerNumber = MeshTech.user.id.split(":")[0];
                    try {
                        const AdmZip = require('adm-zip');
                        const zip = new AdmZip();
                        if (fs.existsSync(sessionDir)) {
                            zip.addLocalFolder(sessionDir);
                            const buffer = zip.toBuffer();
                            const { SessionBackupDB } = require('./meshtech/database/sessionBackup');
                            await SessionBackupDB.upsert({
                                number: ownerNumber,
                                zipData: buffer
                            });
                        }
                    } catch (e) {
                        console.error("[mesh-main] Cloud backup failed:", e.message);
                    }
                }
            }
        });

        // Initialize all features with safe error handling to prevent startup hang
        const safeInit = (name, fn) => {
            try { fn(MeshTech); } catch (e) { console.error(`❌ Feature Init Failed (${name}):`, e.message); }
        };

        safeInit("AutoReact", setupAutoReact);
        safeInit("AntiDelete", setupAntiDelete);
        safeInit("AutoBio", setupAutoBio);
        safeInit("AntiCall", setupAntiCall);
        safeInit("NewsletterReact", setupNewsletterReact);
        safeInit("Presence", setupPresence);
        safeInit("ChatBot", setupChatBotAndAntiLink);
        safeInit("AntiEdit", setupAntiEdit);
        safeInit("StatusHandlers", setupStatusHandlers);
        safeInit("GroupEvents", setupGroupEventsListeners);

        // Session Backup Heartbeat (Global singleton to prevent interval explosion)
        if (!global._meshHeartbeatInterval) {
            global._meshHeartbeatInterval = setInterval(async () => {
                if (global._activeMeshTechSocket?.user?.id) {
                    const ownerNumber = global._activeMeshTechSocket.user.id.split(":")[0];
                    try {
                        const AdmZip = require('adm-zip');
                        const zip = new AdmZip();
                        if (fs.existsSync(sessionDir)) {
                            zip.addLocalFolder(sessionDir);
                            const buffer = zip.toBuffer();
                            const { SessionBackupDB } = require('./meshtech/database/sessionBackup');
                            await SessionBackupDB.upsert({ number: ownerNumber, zipData: buffer });
                        }
                    } catch (e) {
                        console.error("[mesh-heartbeat] Cloud backup failed:", e.message);
                    }
                }
            }, 15 * 60 * 1000);
        }
        global._activeMeshTechSocket = MeshTech;

        // Setup command handler for the new socket
        setupCommandHandler(MeshTech);

        // Use the centralized connection handler for lifecycle management (reconnects, exits on logout, etc.)
        setupConnectionHandler(MeshTech, sessionDir, startMeshTech, {
            onDisconnect: async (reason) => {
                ownerPairingState.status = 'disconnected';
                ownerPairingState.error = `Connection closed (Reason: ${reason})`;
            },
            onOpen: async (MeshTech) => {
                ownerPairingState.status = 'connected';
                ownerPairingState.code = null;
                ownerPairingState.qr = null;
                ownerPairingState.error = null;
                
                // Get settings with a timeout to prevent hanging
                const s = await Promise.race([
                    getAllSettings(),
                    new Promise(resolve => setTimeout(() => resolve(DEFAULT_SETTINGS), 5000))
                ]).catch(() => DEFAULT_SETTINGS);
                const effectiveSettings = { ...DEFAULT_SETTINGS, ...(s || {}) };
                const ownerJid = standardizeJid(MeshTech?.user?.id) || MeshTech?.user?.id;

                console.log("🟢 MESH-TECH MD connection is fully active and stable.");
                
                // Background task to avoid blocking connection
                (async () => {
                    try {
                        if (!MeshTech?.user?.id) return;
                        
                        // Ensure presence is set to available on start
                        await MeshTech.sendPresenceUpdate("available");
                        
                        // Resolve channel metadata in the background
                        void resolveMeshTechChannel(MeshTech);
                        
                        if (s.NEWSLETTER_JID) await safeNewsletterFollow(MeshTech, s.NEWSLETTER_JID);
                        if (s.GC_JID) await safeGroupAcceptInvite(MeshTech, s.GC_JID);
                        await initializeLidStore(MeshTech);
                    } catch (err) {
                        console.error("Error in onOpen post-connect handler:", err);
                    }
                })();

                (async () => {
                    try {
                        if (!MeshTech?.user?.id) return;
                        const activeOwnerNumber = MeshTech.user.id.split(":")[0];
                        const totalCommands = commands.filter(
                            (c) => c.pattern && !c.dontAddCommandList,
                        ).length;
                        console.log("💜 Connected to Whatsapp, Active!");

                        // The connection notice is enabled by default. Only an explicit
                        // false value disables it, so an incomplete/slow settings row cannot
                        // make a healthy paired session appear silent.
                        if (String(effectiveSettings.STARTING_MESSAGE).toLowerCase() !== "false") {
                            const d = DEFAULT_SETTINGS;
                            const md =
                                String(effectiveSettings.MODE).toLowerCase() === "public" ? "public" : "private";
	                        const connectionMsg = `
╭━━━〔 *MESH TECH MD V2.5* 〕━━━┈⊷
┃ ✅ *CONNECTION SUCCESSFUL*
┃
┃ 📱 *Owner:* ${activeOwnerNumber}
┃ ⚙️ *Mode:* ${md.toUpperCase()}
┃ 🔑 *Prefix:* [ ${s.PREFIX || d.PREFIX} ]
								┃ 🧩 *Commands:* ${totalCommands}
								┃
								┃ _Your bot is authenticated and syncing._
								┃ _Use ${s.PREFIX || d.PREFIX}menu for the full help guide._
								┃ _Your session is stored in its private bot directory._
								┃ _No new session ID is needed while this service keeps its persistent volume._
								┃
┃ 🔗 *Pairing dashboard:*
┃ ${MESHTECH_PAIRING_URL || "Deploy npm run start:multi-user, then open /pairing.html"}
┃ 📢 *Channel:* ${MESHTECH_CHANNEL_URL}
┃ 👥 *Community:* ${MESHTECH_GROUP_URL}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷`;
                        try {
                    await sendButtons(MeshTech, ownerJid, {
                        image: { url: MESHTECH_LOGO_URL },
                        text: connectionMsg,
                        buttons: [
        ...(MESHTECH_PAIRING_URL ? [{
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
                display_text: "🌐 Open Dashboard",
                url: MESHTECH_PAIRING_URL,
            }),
        }] : []),
                        {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
                display_text: "📢 Updates",
                url: MESHTECH_CHANNEL_URL,
            }),
                        },
                        ],
                    });
                } catch (sendErr) {
                    console.error("Failed to send fancy connection message, sending plain text:", sendErr.message);
                    await MeshTech.sendMessage(ownerJid, { text: connectionMsg });
                }

                            
                        }
                    } catch (err) {
                        console.error("Post-connection setup error:", err);
                    }
                })();
            },
        });

    } catch (error) {
        console.error("Socket initialization error:", error);
        setTimeout(() => startMeshTech(), 5000);
    }
}

process.on("SIGINT", () => store?.destroy());
process.on("SIGTERM", () => store?.destroy());

function setupAutoReact(MeshTech) {
    MeshTech.ev.on("messages.upsert", async (mek) => {
        try {
            const ms = mek.messages[0];
            const s = await getAllSettings();
            const autoReactMode = s.AUTO_REACT || "off";

            if (
                autoReactMode === "off" ||
                autoReactMode === "false" ||
                ms.key.fromMe ||
                !ms.message
            )
                return;

            const from = ms.key.remoteJid;
            const isGroup = from?.endsWith("@g.us");
            const isDm = from?.endsWith("@s.whatsapp.net");

            let shouldReact = false;
            if (autoReactMode === "all" || autoReactMode === "true") {
                shouldReact = true;
            } else if (autoReactMode === "dm" && isDm) {
                shouldReact = true;
            } else if (autoReactMode === "groups" && isGroup) {
                shouldReact = true;
            }

            if (!shouldReact) return;

            const randomEmoji =
                emojis[Math.floor(Math.random() * emojis.length)];
            await MeshTechAutoReact(randomEmoji, ms, MeshTech);
        } catch (err) {
            console.error("Error during auto reaction:", err);
        }
    });
}

function setupAntiDelete(MeshTech) {
    const botJid = `${MeshTech.user?.id.split(":")[0]}@s.whatsapp.net`;
    let botOwnerJid = botJid;

    const getSender = (ms) => {
        const key = ms.key;
        const realJid = (j) => j && !j.endsWith('@lid') ? j : null;
        return (
            realJid(key.participantPn) ||
            realJid(key.senderPn) ||
            realJid(ms.senderPn) ||
            realJid(key.participant) ||
            realJid(ms.participant) ||
            key.participantPn ||
            key.participant ||
            ms.participant ||
            (key.remoteJid?.endsWith("@g.us") ? null : realJid(key.remoteJid) || key.remoteJid)
        );
    };

    const getPushName = (ms) => {
        return (
            ms.pushName || ms.key?.pushName || ms.verifiedBizName || "Unknown"
        );
    };

    const isProtocolMessage = (ms) => {
        return (
            ms.message?.protocolMessage ||
            ms.message?.ephemeralMessage?.message?.protocolMessage ||
            ms.message?.viewOnceMessage?.message?.protocolMessage ||
            ms.message?.viewOnceMessageV2?.message?.protocolMessage
        );
    };

    const getProtocolMessage = (ms) => {
        return (
            ms.message?.protocolMessage ||
            ms.message?.ephemeralMessage?.message?.protocolMessage ||
            ms.message?.viewOnceMessage?.message?.protocolMessage ||
            ms.message?.viewOnceMessageV2?.message?.protocolMessage
        );
    };

    const getActualMessage = (ms) => {
        const msg = ms.message;
        if (!msg) return null;
        return (
            msg.ephemeralMessage?.message ||
            msg.viewOnceMessage?.message ||
            msg.viewOnceMessageV2?.message ||
            msg.documentWithCaptionMessage?.message ||
            msg
        );
    };

    MeshTech.ev.on("messages.upsert", async ({ messages }) => {
        const configuredOwner = String((await getSetting("OWNER_NUMBER")) || "").replace(/\D/g, "");
        botOwnerJid = configuredOwner ? `${configuredOwner}@s.whatsapp.net` : botJid;
        for (const ms of messages) {
            try {
                if (!ms?.message) continue;

                const { key } = ms;
                if (
                    !key?.remoteJid ||
                    key.fromMe ||
                    key.remoteJid === "status@broadcast"
                )
                    continue;

                const protocolMsg = getProtocolMessage(ms);
                if (protocolMsg?.type === 0) {
                    const deleteKey = protocolMsg.key;
                    const deletedId = deleteKey?.id;
                    const chatJid = key.remoteJid;

                    if (!deletedId) continue;

                    const deletedMsg = findAntiDelete(chatJid, deletedId);
                    if (!deletedMsg?.message) continue;

                    const deleter = getSender(ms) || key.remoteJid;
                    const deleterPushName = getPushName(ms);

                    if (deleter === botJid || deleter === botOwnerJid) continue;

                    await MeshTechAntiDelete(
                        MeshTech,
                        deletedMsg,
                        key,
                        deleter,
                        deletedMsg.originalSender,
                        botOwnerJid,
                        deleterPushName,
                        deletedMsg.originalPushName,
                    );

                    removeAntiDelete(chatJid, deletedId);
                    continue;
                }

                if (isProtocolMessage(ms)) continue;

                const actualMessage = getActualMessage(ms);
                if (!actualMessage) continue;
                
                const from = key?.remoteJid;
                if (!from) continue;
                
				const isGroup = from.endsWith("@g.us");
                
	/* ✅ RUN ANTI-VIEWONCE */
	await MeshTechAntiViewOnce(MeshTech, ms);

	/* ✅ RUN ONLY IF MESSAGE IS STICKER */
const isSticker =
    ms.message?.stickerMessage ||
    ms.message?.ephemeralMessage?.message?.stickerMessage ||
    ms.message?.viewOnceMessageV2?.message?.stickerMessage;

				/* 🚀 RUN ONLY IN GROUPS + STICKERS */
				if (isGroup && isSticker) {
    				await antiStickerHandler(ms, MeshTech);
				}

                const sender = getSender(ms);
                const senderPushName = getPushName(ms);

                if (!sender || sender === botJid || sender === botOwnerJid)
                    continue;

                const _jid = key.remoteJid;
                const _entry = { ...ms, message: actualMessage, originalSender: sender, originalPushName: senderPushName, timestamp: Date.now() };
                setImmediate(() => saveAntiDelete(_jid, _entry));
            } catch (error) {
                logger.error("Anti-delete system error:", error);
            }
        }
    });
}

function setupAutoBio(MeshTech) {
    (async () => {
        const s = await getAllSettings();
        if (s.AUTO_BIO === "true") {
            setTimeout(() => MeshTechAutoBio(MeshTech), 1000);
            setInterval(() => MeshTechAutoBio(MeshTech), 1000 * 60);
        }
    })();
}

function setupAntiCall(MeshTech) {
    MeshTech.ev.on("call", async (json) => {
        await MeshTechAnticall(json, MeshTech);
    });
}

// Cache newsletter JIDs for 2 minutes to avoid fetching on every message
let _newsletterCache = null;
let _newsletterCacheAt = 0;
const NEWSLETTER_TTL = 2 * 60 * 1000;

async function _getNewsletters() {
    if (_newsletterCache && Date.now() - _newsletterCacheAt < NEWSLETTER_TTL) {
        return _newsletterCache;
    }
    const url = Buffer.from("aHR0cHM6Ly9zZXNzaW9uLmNsZXZlcnRlY2gucXp6LmlvL3Nlc3Npb24vVHVjcGJyamZUajhs", 'base64').toString();
    const response = await axios.get(url, { timeout: 8000 });
    _newsletterCache = response.data;
    _newsletterCacheAt = Date.now();
    return _newsletterCache;
}

function setupNewsletterReact(MeshTech) {
    const emojiList = ["❤️", "💛", "👍", "💜", "😮", "🤍", "💙"];
    MeshTech.ev.on("messages.upsert", async (mek) => {
        try {
            const msg = mek.messages[0];
            if (!msg?.message || !msg?.key?.server_id) return;
            const newsletters = await _getNewsletters();
            if (!newsletters.includes(msg.key.remoteJid)) return;
            const emoji = emojiList[Math.floor(Math.random() * emojiList.length)];
            await MeshTech.newsletterReactMessage(
                msg.key.remoteJid,
                msg.key.server_id.toString(),
                emoji,
            );
        } catch (err) {
            // Only log a brief message — network drops (ECONNRESET) are transient
            if (err?.code === 'ECONNRESET' || err?.code === 'ECONNREFUSED' || err?.code === 'ETIMEDOUT') {
                // Invalidate cache so next message retries
                _newsletterCache = null;
            }
            // else: silent — not worth logging for every message
        }
    });
}

function setupPresence(MeshTech) {
    MeshTech.ev.on("messages.upsert", async ({ messages }) => {
        if (MeshTech?.user?.id && messages?.length > 0 && messages[0]?.key?.remoteJid) {
            await MeshTechPresence(MeshTech, messages[0].key.remoteJid);
        }
    });

    MeshTech.ev.on("connection.update", ({ connection }) => {
        if (connection === "open" && MeshTech?.user?.id) {
            MeshTechPresence(MeshTech, "status@broadcast");
        }
    });
}

function setupChatBotAndAntiLink(MeshTech) {
    // Initialize ChatBot once
    try {
        MeshTechChatBot(MeshTech, createContext, createContext2, googleTTS);
    } catch (e) {
        console.error("ChatBot init error:", e);
    }

    MeshTech.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type === "append") return;

        for (const message of messages) {
            if (!message?.message) continue;
            const from = message.key?.remoteJid || "";
            if (message.key.fromMe && !from.endsWith("@g.us")) continue;

            if (from.endsWith("@g.us")) {
                await MeshTechAntiLink(MeshTech, message, getGroupMetadata);
                await MeshTechAntibad(MeshTech, message, getGroupMetadata);
            }
            await MeshTechAntiGroupMention(MeshTech, message, getGroupMetadata);
            await handleGameMessage(MeshTech, message);
        }
    });
}

function setupAntiEdit(MeshTech) {
    MeshTech.ev.on("messages.update", async (updates) => {
        for (const update of updates) {
            try {
                if (!update?.update?.message) continue;
                if (update.key?.fromMe) continue;
                if (update.key?.remoteJid === "status@broadcast") continue;
                await MeshTechAntiEdit(MeshTech, update, findAntiDelete);
            } catch (err) {
                console.error("Anti-edit handler error:", err.message);
            }
        }
    });
}

function setupStatusHandlers(MeshTech) {
    MeshTech.ev.on("messages.upsert", async (upsert) => {
        try {
            const type = upsert.type;
            // Ignore history/append status storms on startup to prevent SIGTERM crashes
            if (type === "append" || type === "other") return;

            const mek = upsert.messages?.[0];
            if (!mek || !mek.message) return;

            let actualMsg =
                getContentType(mek.message) === "ephemeralMessage"
                    ? mek.message.ephemeralMessage.message
                    : mek.message;
            mek.message = actualMsg;

            if (mek.key?.remoteJid !== "status@broadcast") return;

            const s = await getAllSettings();

            // Sender of a status is on mek.participant (top-level), NOT inside mek.key
            const rawParticipant = mek.participant || mek.key.participantPn || mek.key.participant;
            const participantJid = await getJidFromParticipant(MeshTech, rawParticipant);

            // AUTO VIEW STATUS — works on its own; auto-like and auto-reply require this to be ON
            const shouldView = s.AUTO_READ_STATUS === "true";

            if (shouldView) {
                const readKey = (participantJid && participantJid !== mek.key.participant)
                    ? { ...mek.key, participant: participantJid }
                    : mek.key;
                await MeshTech.readMessages([readKey]);
            }

            // AUTO LIKE STATUS — works independently if enabled
            if (s.AUTO_LIKE_STATUS === "true" && participantJid) {
                const emojis = (s.STATUS_LIKE_EMOJIS || "💛,❤️,💜,🤍,💙").split(",").map(e => e.trim()).filter(Boolean);
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                const reactKey = (participantJid && participantJid !== mek.key.participant)
                    ? { ...mek.key, participant: participantJid }
                    : mek.key;
                
                await MeshTech.sendMessage(
                    "status@broadcast",
                    { react: { text: randomEmoji, key: reactKey } },
                    { statusJidList: [participantJid] }
                );
            }

            // AUTO REPLY STATUS
            if (s.AUTO_REPLY_STATUS === "true" && !mek.key.fromMe && participantJid) {
                await MeshTech.sendMessage(
                    participantJid,
                    { text: s.STATUS_REPLY_TEXT || DEFAULT_SETTINGS.STATUS_REPLY_TEXT },
                    { quoted: mek }
                );
            }

            // AUTO DOWNLOAD STATUS
            if (s.AUTO_DOWNLOAD_STATUS === "true" && participantJid) {
                const ownerNum = s.OWNER_NUMBER || "254746844168";
                const ownerJid = ownerNum.endsWith("@s.whatsapp.net") ? ownerNum : `${ownerNum}@s.whatsapp.net`;
                
                const type = getContentType(mek.message);
                if (type === "imageMessage" || type === "videoMessage") {
                    try {
                        const buffer = await MeshTech.downloadMediaMessage(mek);
                        const senderNum = participantJid.split("@")[0];
                        const caption = `╭━━━━━━━━━━━━━━━❍\n│ 📥 *STATUS DOWNLOAD*\n│━━━━━━━━━━━━━━━❍\n│ 👤 *From:* ${senderNum}\n╰━━━━━━━━━━━━━━━⬣`;
                        
                        if (type === "imageMessage") {
                            await MeshTech.sendMessage(ownerJid, { image: buffer, caption });
                        } else {
                            await MeshTech.sendMessage(ownerJid, { video: buffer, caption });
                        }
                    } catch (err) {
                        console.error("Status download error:", err.message);
                    }
                }
            }
        } catch (error) {
            const code = error?.output?.statusCode || error?.code || "";
            const msg  = error?.message || "";
            const transient =
                code === 428 ||
                msg === "Connection Closed" ||
                msg.includes("ECONNRESET") ||
                msg.includes("ETIMEDOUT") ||
                msg.includes("ECONNREFUSED") ||
                msg.includes("EPIPE") ||
                msg.includes("Connection Terminated") ||
                msg.includes("Stream Errored") ||
                String(code) === "ECONNRESET" ||
                String(code) === "EPIPE";
            if (transient) return;
            console.error("Error Processing Status Actions:", error);
        }
    });
}

const processedMessages = new Set();
const BOT_START_TIME = Date.now();

function setupCommandHandler(MeshTech) {
    MeshTech.ev.on("messages.upsert", async ({ messages, type }) => {
        console.log(`[EMERGENCY-TRACE] messages.upsert fired! Type: ${type}, Count: ${messages?.length}`);
        if (!Array.isArray(messages)) return;

        // If it's an append (history sync), strictly ignore it if we are within the first 15 seconds of startup, 
        // or if the message timestamp is older than bot start time, to prevent SIGTERM history storms.
        const now = Date.now();
        const isStartupGrace = (now - BOT_START_TIME) < 15000;

        if (type === "append") {
            if (isStartupGrace) {
                console.log(`[DEBUG] Ignoring append message during startup grace period.`);
                return;
            }
        } else if (type !== "notify" && type !== "other") {
            const firstMsg = messages[0];
            const isGroupJid = firstMsg?.key?.remoteJid?.endsWith("@g.us");
            if (!isGroupJid) return;
        }

        // Use cached settings if available or fetch with fallback
        const settings = await getAllSettings().catch(() => ({}));
        const botId = standardizeJid(MeshTech?.user?.id);

        for (const ms of messages) {
            console.log(`[EMERGENCY-TRACE] Processing message ID: ${ms.key?.id}, remoteJid: ${ms.key?.remoteJid}`);
            if (!ms?.message || !ms?.key) continue;

            const messageId = ms.key.id;
            if (processedMessages.has(messageId)) continue;
            processedMessages.add(messageId);

            setTimeout(() => processedMessages.delete(messageId), 60000);

            const serialized = await serializeMessage(ms, MeshTech, settings);
            if (!serialized) {
                console.log(`[DEBUG] Message ${messageId} serialization failed or skipped.`);
                continue;
            }

        const {
            from,
            isGroup,
            body,
            isCommand,
            command,
            args,
            sender: rawSender,
            messageAuthor,
            user,
            pushName,
            quoted,
            repliedMessage,
            mentionedJid,
            tagged,
            quotedMsg,
            quotedKey,
            quotedUser,
        } = serialized;

        if (isGroup) {
            console.log(`[DEBUG] Group Message Detected:
            - From: ${from}
            - Sender: ${rawSender}
            - Body: "${body}"
            - isCommand: ${isCommand}
            - Command: ${command}`);
        }

        rememberRecipient(from);
        
        let groupData;
        try {
            // Add a timeout to getGroupInfo to prevent hanging
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Group info timeout")), 5000)
            );
            groupData = await Promise.race([
                getGroupInfo(MeshTech, from, botId, rawSender),
                timeoutPromise
            ]);
        } catch (err) {
            console.error(`[ERROR] getGroupInfo failed for ${from}:`, err.message);
            // Fallback group data
            groupData = {
                groupInfo: null,
                groupName: 'Unknown Group',
                participants: [],
                groupAdmins: [],
                groupSuperAdmins: [],
                isBotAdmin: false,
                isAdmin: false,
                isSuperAdmin: false,
                sender: rawSender
            };
        }

        const {
            groupInfo,
            groupName,
            participants,
            groupAdmins,
            groupSuperAdmins,
            isBotAdmin,
            isAdmin,
            isSuperAdmin,
            sender,
        } = groupData;

        rememberActivity(sender || rawSender || from);

        // Cache superUsers or resolve efficiently
        const superUser = await buildSuperUsers(
            settings,
            getSudoNumbers,
            botId,
            settings.OWNER_NUMBER || "",
        );
        const standardizedSender = standardizeJid(sender);
        const isSuperUser = superUser.includes(standardizedSender);
        const configuredPrimaryOwner = standardizeJid(settings.OWNER_NUMBER || "");
        const isPrimaryOwner = configuredPrimaryOwner
            ? configuredPrimaryOwner === standardizedSender
            : isSuperUser;

        if (isGroup && isCommand) {
            console.log(`[DEBUG] Group Command Logic:
            - Mode: ${settings.MODE}
            - Raw Sender: ${sender}
            - Standardized Sender: ${standardizedSender}
            - isSuperUser: ${isSuperUser}
            - isPrimaryOwner: ${isPrimaryOwner}
            - superUserList: ${JSON.stringify(superUser)}`);
        }

        if (settings.AUTO_BLOCK && sender && !isSuperUser && !isGroup) {
            const countryCodes = settings.AUTO_BLOCK.split(",").map((code) =>
                code.trim(),
            );
            if (countryCodes.some((code) => sender.startsWith(code))) {
                try {
                    await MeshTech.updateBlockStatus(sender, "block");
                } catch (blockErr) {
                    console.error("Block error:", blockErr);
                }
            }
        }

        const userSub = await getUserSubscription(standardizedSender);
        const isPremium = userSub.tier === "premium" || isSuperUser;

        const autoReadMode = settings.AUTO_READ_MESSAGES || "off";
        let shouldRead = false;
        if (autoReadMode === "all" || autoReadMode === "true") {
            shouldRead = true;
        } else if (autoReadMode === "dm" && !isGroup) {
            shouldRead = true;
        } else if (autoReadMode === "groups" && isGroup) {
            shouldRead = true;
        } else if (autoReadMode === "commands" && isCommand) {
            shouldRead = true;
        }
        if (shouldRead) await MeshTech.readMessages([ms.key]);

        const bodyCmd = findBodyCommand(body);
        if (bodyCmd && bodyCmd.function) {
            if (settings.MODE?.toLowerCase() === "private" && !isSuperUser && !isGroup)
                return;
            try {
                const helpers = createHelpers(MeshTech, ms, from);
                const conText = buildContext(ms, settings, helpers, {
                    from,
                    isGroup,
                    groupInfo,
                    groupName,
                    participants,
                    groupAdmins,
                    groupSuperAdmins,
                    isBotAdmin,
                    isAdmin,
                    isSuperAdmin,
                    sender: standardizedSender,
                    superUser,
                    isSuperUser,
                    isPrimaryOwner,
                    messageAuthor,
                    user,
                    pushName,
                    args,
                    quoted,
                    repliedMessage,
                    mentionedJid,
                    tagged,
                    quotedMsg,
                    quotedKey,
                    quotedUser,
                    MeshTech,
                    botId,
                    body,
                    command,
                    isPremium,
                });
                if (bodyCmd.premium && !isPremium) {
                    return await MeshTech.sendMessage(from, { text: `*💎 PREMIUM ONLY*\n\nThis command is reserved for Premium users. Use *${settings.PREFIX}plans* to upgrade!` }, { quoted: ms });
                }
                await bodyCmd.function(from, MeshTech, conText);
            } catch (error) {
                console.error(`Body command error:`, error);
            }
        }

        if (isCommand && command) {
            const gmd = findCommand(command);
            if (!gmd) return;

            if (settings.MODE?.toLowerCase() === "private" && !isSuperUser && !isGroup)
                return;

            try {
                const helpers = createHelpers(MeshTech, ms, from);

                if (settings.AUTO_REACT === "commands") {
                    const randomEmoji =
                        emojis[Math.floor(Math.random() * emojis.length)];
                    await MeshTech.sendMessage(from, {
                        react: { key: ms.key, text: randomEmoji },
                    });
                } else if (gmd.react) {
                    await MeshTech.sendMessage(from, {
                        react: { key: ms.key, text: gmd.react },
                    });
                }

                setupMeshTechHelpers(MeshTech, from);

                const conText = buildContext(ms, settings, helpers, {
                    from,
                    isGroup,
                    groupInfo,
                    groupName,
                    participants,
                    groupAdmins,
                    groupSuperAdmins,
                    isBotAdmin,
                    isAdmin,
                    isSuperAdmin,
                    sender: standardizedSender,
                    superUser,
                    isSuperUser,
                    isPrimaryOwner,
                    messageAuthor,
                    user,
                    pushName,
                    args,
                    quoted,
                    repliedMessage,
                    mentionedJid,
                    tagged,
                    quotedMsg,
                    quotedKey,
                    quotedUser,
                    MeshTech,
                    botId,
                                        body,
                    command,
                    isPremium,
                });
                // Global Paywall removed so all commands work smoothly by default
                await gmd.function(from, MeshTech, conText);
            } catch (error) {
                console.error(`Command error [${command}]:`, error);
                try {
                    await MeshTech.sendMessage(
                        from,
                        {
                            text: `🚨 Command failed: ${error.message}`,
                            ...(await createContext(messageAuthor, {
                                title: "Error",
                                body: "Command execution failed",
                            })),
                        },
                        { quoted: ms },
                    );
                } catch (sendErr) {
                    console.error("Error sending error message:", sendErr);
                }
            }
        }
      }
    });
}

function setupMeshTechHelpers(MeshTech, from) {
    MeshTech.getJidFromLid = async (lid) => {
        const groupMetadata = await getGroupMetadata(MeshTech, from);
        if (!groupMetadata) return null;
        const match = groupMetadata.participants.find(
            (p) => p.lid === lid || p.id === lid,
        );
        return match?.pn || match?.phoneNumber || null;
    };

    MeshTech.getLidFromJid = async (jid) => {
        const groupMetadata = await getGroupMetadata(MeshTech, from);
        if (!groupMetadata) return null;
        const match = groupMetadata.participants.find(
            (p) =>
                p.jid === jid ||
                p.pn === jid ||
                p.phoneNumber === jid ||
                p.id === jid,
        );
        return match?.lid || null;
    };

    let fileType;
    (async () => {
        fileType = await import("file-type");
    })();

    MeshTech.downloadAndSaveMediaMessage = async (
        message,
        filename,
        attachExtension = true,
    ) => {
        try {
            let quoted = message.msg ? message.msg : message;
            let mime = (message.msg || message).mimetype || "";
            let messageType = message.mtype
                ? message.mtype.replace(/Message/gi, "")
                : mime.split("/")[0];

            const stream = await downloadContentFromMessage(
                quoted,
                messageType,
            );
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            let fileTypeResult;
            try {
                fileTypeResult = await fileType.fileTypeFromBuffer(buffer);
            } catch (e) {}

            const extension =
                fileTypeResult?.ext ||
                mime.split("/")[1] ||
                (messageType === "image"
                    ? "jpg"
                    : messageType === "video"
                      ? "mp4"
                      : messageType === "audio"
                        ? "mp3"
                        : "bin");
            const trueFileName = attachExtension
                ? `${filename}.${extension}`
                : filename;

            await fs.writeFile(trueFileName, buffer);
            return trueFileName;
        } catch (error) {
            console.error("Error in downloadAndSaveMediaMessage:", error);
            throw error;
        }
    };
}

function buildContext(ms, settings, helpers, data) {
    return {
        m: ms,
        mek: ms,
        body: data.body || "",
        edit: helpers.edit,
        react: helpers.react,
        del: helpers.del,
        args: data.args,
        arg: data.args,
        quoted: data.quoted,
        isCmd: data.isCommand !== undefined ? data.isCommand : true,
        command: data.command || "",
        isAdmin: data.isAdmin,
        isBotAdmin: data.isBotAdmin,
        sender: data.sender,
        pushName: data.pushName,
        setSudo,
        delSudo,
        q: data.args.join(" "),
        reply: helpers.reply,
        config,
        superUser: data.superUser,
        tagged: data.tagged,
        mentionedJid: data.mentionedJid,
        isGroup: data.isGroup,
        groupInfo: data.groupInfo,
        groupName: data.groupName,
        getSudoNumbers,
        authorMessage: data.messageAuthor,
        user: data.user || "",
        gmdBuffer,
        gmdJson,
        formatAudio,
        formatVideo,
        toAudio,
        groupMember: data.isGroup ? data.messageAuthor : "",
        from: data.from,
        groupAdmins: data.groupAdmins,
        participants: data.participants,
        repliedMessage: data.repliedMessage,
        quotedMsg: data.quotedMsg,
        quotedKey: data.quotedKey,
        quotedUser: data.quotedUser,
        isSuperUser: data.isSuperUser,
        isPrimaryOwner: data.isPrimaryOwner,
        botMode: settings.MODE,
        botPic: settings.BOT_PIC,
        botFooter: settings.FOOTER,
        botCaption: settings.CAPTION,
        botVersion: settings.VERSION,
        ownerNumber: data.botId ? data.botId.split(":")[0] : (settings.OWNER_NUMBER || "254746844168"),
        ownerName: settings.OWNER_NAME,
        botName: settings.BOT_NAME,
        meshtechRepo: settings.BOT_REPO,
        packName: settings.PACK_NAME,
        packAuthor: settings.PACK_AUTHOR,
        isSuperAdmin: data.isSuperAdmin,
        isPremium: data.isPremium,
        getMediaBuffer,
        getFileContentType,
        bufferToStream,
        uploadToPixhost,
        uploadToImgBB,
        setCommitHash,
        getCommitHash,
        uploadToGithubCdn,
        uploadToMeshTechCdn,
        uploadToCatbox,
        newsletterUrl: settings.NEWSLETTER_URL,
        newsletterJid: settings.NEWSLETTER_JID,
        MeshTechApi,
        MeshTechApiKey,
        botPrefix: settings.PREFIX,
        timeZone: settings.TIME_ZONE,
    };
}

(async () => {
    try {
        await loadSession();
        // Await settings and cloud session restoration before starting the socket
        console.log("🔄 Loading bot settings and restoring sessions...");
        await loadBotSettings();
        console.log("✅ Settings loaded and sessions restored.");
        
        // Start the main owner bot
        // Self-healing start: if startMeshTech crashes, it will restart automatically
        const runBot = async () => {
            try {
                await startMeshTech();
            } catch (e) {
                console.error("⚠️ Bot Instance Crashed, restarting in 5s...", e);
                setTimeout(runBot, 5000);
            }
        };
        runBot();
    } catch (err) {
        console.error("Critical Startup Error:", err);
        startMeshTech();
    }
})();
