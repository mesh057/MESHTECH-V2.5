const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

function extractPairingCode(output) {
  const match = String(output || '').match(/\bPAIRING_CODE\s+([A-Z0-9]{4,8}(?:-[A-Z0-9]{4,8})?)\b/i);
  return match ? match[1].toUpperCase() : null;
}

function extractPairingQr(output) {
  const match = String(output || '').match(/\bPAIRING_QR\s+([^\n\r]+)/i);
  return match ? match[1].trim() : null;
}

function extractPairingError(output) {
  const match = String(output || '').match(/\bPAIRING_ERROR\s+([^\n\r]+)/i);
  return match ? match[1].trim().slice(0, 240) : null;
}

function isRegisteredSession(authInfoDir) {
  const credsPath = path.join(authInfoDir, 'creds.json');
  try {
    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
    if (creds && typeof creds.registered === 'boolean') return creds.registered;
  } catch (_) {}

  const databasePath = path.join(authInfoDir, 'session.db');
  if (!fs.existsSync(databasePath)) return false;
  try {
    const Database = require('better-sqlite3');
    const db = new Database(databasePath, { readonly: true });
    const row = db.prepare('SELECT value FROM session WHERE id = ?').get('creds');
    db.close();
    if (!row?.value) return false;
    const creds = JSON.parse(row.value);
    return Boolean(creds?.registered);
  } catch (_) {
    return false;
  }
}

class MultiUserSessionManager {
  constructor(options = {}) {
    const configuredRoot = options.rootDir || process.env.MULTI_USER_AUTH_DIR || process.env.AUTH_DIR;
    const mountedRoot = fs.existsSync('/data') ? '/data/meshtech/auth_sessions' : path.join(process.cwd(), 'auth_sessions');
    this.rootDir = path.resolve(configuredRoot || mountedRoot);
    this.usingPersistentPath = this.rootDir === path.resolve('/data/meshtech/auth_sessions') || this.rootDir.startsWith(`${path.resolve('/data')}${path.sep}`);
    this.botEntry = path.resolve(options.botEntry || path.join(__dirname, '..', 'index.js'));
    this.sessions = new Map();

    const rawLimit = String(options.maxInstances ?? process.env.MAX_BOT_INSTANCES ?? 'unlimited').trim().toLowerCase();
    const parsedLimit = Number(rawLimit);
    this.maxInstances = ['unlimited', 'infinite', 'infinity', '0', '-1', ''].includes(rawLimit)
      ? Infinity
      : (Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.floor(parsedLimit) : Infinity);

    try {
      fs.mkdirSync(this.rootDir, { recursive: true });
    } catch (e) {
      console.error(`[mesh-multi-user] FAILED to create auth root at ${this.rootDir}:`, e.message);
      this.rootDir = path.join(process.cwd(), 'auth_sessions');
      fs.mkdirSync(this.rootDir, { recursive: true });
      this.usingPersistentPath = false;
    }
    if (!this.usingPersistentPath) {
      console.warn(`[mesh-multi-user] WARNING: auth root is ${this.rootDir}; configure MULTI_USER_AUTH_DIR=/data/meshtech/auth_sessions on a persistent volume to survive updates.`);
    }
  }

  normalizePhoneNumber(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) throw new Error('Enter a valid phone number with country code.');
    return digits;
  }

  sessionDir(number) {
    return path.join(this.rootDir, this.normalizePhoneNumber(number));
  }

  listRestorableSessions() {
    try {
      return fs.readdirSync(this.rootDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && /^\d{8,15}$/.test(entry.name))
        .map((entry) => entry.name)
        .filter((number) => isRegisteredSession(path.join(this.sessionDir(number), 'auth_info')));
    } catch (error) {
      console.error('[mesh-multi-user] Could not inspect stored sessions:', error.message);
      return [];
    }
  }

  async restoreSavedSessions() {
    const restored = [];
    // Restore sessions asynchronously in the background so server.listen() is never blocked or killed by Railway startup timeout
    (async () => {
      for (const number of this.listRestorableSessions()) {
        let restoredThisSession = false;
        for (let attempt = 1; attempt <= 2 && !restoredThisSession; attempt += 1) {
          try {
            await this.start(number, false, true);
            restored.push(number);
            restoredThisSession = true;
          } catch (error) {
            console.error(`[mesh-multi-user] Could not restore ${number} (attempt ${attempt}/2):`, error.message);
            if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 3000));
          }
        }
      }
    })().catch(err => console.error('[mesh-multi-user] Background restore error:', err));
    return restored;
  }

  get(number) {
    return this.sessions.get(this.normalizePhoneNumber(number));
  }

  count() {
    return this.sessions.size;
  }

  list() {
    return Array.from(this.sessions.values()).map((record) => this.publicSession(record));
  }

  hasSessionCapacity(number) {
    const normalized = this.normalizePhoneNumber(number);
    return this.sessions.has(normalized) || this.sessions.size < this.maxInstances;
  }

  async clear(number) {
    const normalized = this.normalizePhoneNumber(number);
    await this.stopAndWait(normalized);
    const authDir = this.sessionDir(normalized);
    if (!fs.existsSync(authDir)) return true;

    // The child process must be fully stopped before auth files are removed.
    // This prevents a stale Baileys process from recreating credentials after a
    // user clicks Force New Pairing.
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        fs.rmSync(authDir, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 });
        return !fs.existsSync(authDir);
      } catch (error) {
        console.error(`[mesh-multi-user] Could not clear session directory for ${normalized} (attempt ${attempt}/3):`, error.message);
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
    return !fs.existsSync(authDir);
  }

  async start(number, useQr = false, restoring = false, importedSessionId = '', force = false) {
    const normalized = this.normalizePhoneNumber(number);
    
    if (force || (!restoring && !importedSessionId)) {
      // If we are not restoring, we want a fresh pairing. Clear stale auth.
      await this.clear(normalized);
    }

    const existing = this.sessions.get(normalized);
    const existingAlive = existing && existing.child && existing.child.exitCode === null && !existing.child.killed;
    if (existingAlive && !force) return this.publicSession(existing);
    
    if (existing) {
      await this.stopAndWait(normalized);
    }

    if (!this.hasSessionCapacity(normalized)) {
      const error = new Error(`Maximum active sessions reached (${this.maxInstances}).`);
      error.code = 'SESSION_CAPACITY_REACHED';
      throw error;
    }

    const authDir = this.sessionDir(normalized);
    const authInfoDir = path.join(authDir, 'auth_info');
    const dataDir = path.join(authDir, 'data');
    fs.mkdirSync(authInfoDir, { recursive: true });
    fs.mkdirSync(dataDir, { recursive: true });

    const record = {
      number: normalized,
      accessToken: crypto.randomBytes(32).toString('hex'),
      authDir,
      status: restoring ? 'restoring' : 'starting',
      code: null,
      qr: null,
      error: null,
      startedAt: new Date().toISOString(),
      lastOutput: '',
      outputBuffer: '',
      child: null,
    };

    const child = spawn(process.execPath, [this.botEntry], {
      cwd: authDir,
      env: {
        ...process.env,
        // Do not let a parent SESSION_ID overwrite this isolated account.
        SESSION_ID: importedSessionId || '',
        MESH_PAIRING_PHONE_NUMBER: normalized,
        MESH_MULTI_USER_SESSION_OWNER: normalized,
        MESH_MULTI_USER_SESSION_MODE: 'public',
        MESH_MULTI_USER_SESSION_DIR: authDir,
        MULTI_USER_AUTH_DIR: this.rootDir,
        // The multi-session dashboard owns the host's public PORT. Child bot
        // processes do not expose HTTP routes and must not compete for it.
        MESH_DISABLE_HTTP_SERVER: 'true',
        PORT: '0',
        AUTH_DIR: authInfoDir,
        SESSION_DB_FILE: path.join(authInfoDir, 'session.db'),
        DATA_FILE: path.join(dataDir, 'bot.db'),
        MESSAGE_STORE_FILE: path.join(dataDir, 'store.db'),
        MESH_PAIRING_MODE: useQr ? 'qr' : 'code',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    record.child = child;
    record.pid = child.pid;
    this.sessions.set(normalized, record);

    const consume = (chunk) => {
      const output = String(chunk);
      record.lastOutput = output.trim().slice(-2000);
      record.outputBuffer = `${record.outputBuffer}${output}`.slice(-5000);

      const code = extractPairingCode(record.outputBuffer);
      if (code) {
        record.code = code;
        record.error = null;
        record.status = 'pairing_code_ready';
      }

      const qr = extractPairingQr(record.outputBuffer);
      if (qr) {
        record.qr = qr;
        record.error = null;
        record.status = 'pairing_qr_ready';
      }

      const pairingError = extractPairingError(record.outputBuffer);
      if (pairingError && !record.code && !record.qr) {
        record.error = pairingError;
        record.status = 'error';
      }

      if (/Connecting Bot|Connecting\.\.\./i.test(output)) record.status = 'connecting';
      if (/Reconnection attempt/i.test(output)) record.status = 'retrying';
      if (/Connection Instance is Online|Connected to Whatsapp/i.test(output)) {
        // Pairing output can remain in the rolling buffer after WhatsApp is online.
        // Clear it so the authoritative connected state triggers session export.
        record.code = null;
        record.qr = null;
        record.error = null;
        record.status = 'running';
      }
    };

    child.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
      consume(chunk);
    });
    child.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
      consume(chunk);
    });
    child.on('error', (error) => {
      record.status = 'error';
      record.error = error.message;
      record.lastOutput = error.message;
    });
    child.on('exit', (code, signal) => {
      const wasRunning = record.status === 'running';
      // If it was running and exited with 0, we treat it as a requested restart
      const isRestart = wasRunning && code === 0;
      
      if (record.status !== 'stopped') {
        record.status = (code === 0 && !isRestart) ? 'stopped' : 'error';
      }
      
      record.exitCode = code;
      record.signal = signal;
      
      if (record.status === 'error' && !record.error) {
        record.error = record.lastOutput || 'The WhatsApp pairing session stopped unexpectedly.';
      }

      // Auto-restart if it was running and didn't stop intentionally, or if it's a requested restart
      if ((wasRunning && record.status !== 'stopped') || isRestart) {
        const delay = isRestart ? 2000 : 5000;
        console.log(`[mesh-multi-user] Session ${normalized} ${isRestart ? 'restarting' : 'exited unexpectedly'}. Restarting in ${delay}ms...`);
        setTimeout(() => {
          this.start(normalized, false, true).catch(err => {
            console.error(`[mesh-multi-user] Failed to auto-restart ${normalized}:`, err.message);
          });
        }, delay);
      }
    });

    return this.publicSession(record);
  }

  stop(number) {
    const normalized = this.normalizePhoneNumber(number);
    const record = this.sessions.get(normalized);
    if (!record) return false;
    record.status = 'stopped';
    if (record.child && !record.child.killed && record.child.exitCode === null) record.child.kill('SIGTERM');
    this.sessions.delete(normalized);
    return true;
  }

  async stopAndWait(number, timeoutMs = 5000) {
    const normalized = this.normalizePhoneNumber(number);
    const record = this.sessions.get(normalized);
    if (!record) return false;
    const child = record.child;
    this.stop(normalized);
    if (!child || child.exitCode !== null) return true;

    await new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(() => {
        try { if (child.exitCode === null) child.kill('SIGKILL'); } catch (_) {}
        finish();
      }, timeoutMs);
      child.once('exit', finish);
      try { if (child.exitCode === null && !child.killed) child.kill('SIGTERM'); } catch (_) { finish(); }
    });
    return true;
  }

  publicSession(record) {
    return {
      number: record.number,
      accessToken: record.accessToken,
      status: record.status,
      code: record.code,
      qr: record.qr,
      error: record.error,
      pid: record.pid,
      authDir: record.authDir,
    };
  }
}

module.exports = { MultiUserSessionManager, extractPairingCode, extractPairingQr, extractPairingError, isRegisteredSession };
