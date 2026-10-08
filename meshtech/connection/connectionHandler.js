const { DisconnectReason } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const fs = require("fs-extra");
const { setupGroupCacheListeners } = require("./groupCache");
const { setupGroupEventsListeners } = require("./groupEvents");

const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 100;

const safeNewsletterFollow = async (MeshTech, newsletterJid) => {
    if (!newsletterJid) return false;
    try {
        await MeshTech.newsletterFollow(newsletterJid);
        return true;
    } catch (error) {
        console.error(`❌ Channel follow failed for ${newsletterJid}:`, error.message);
        return false;
    }
};

const safeGroupAcceptInvite = async (MeshTech, groupJid) => {
    if (!groupJid) return false;
    try {
        await MeshTech.groupAcceptInvite(groupJid);
        return true;
    } catch (error) {
        console.error(`❌ Group join failed for ${groupJid}:`, error.message);
        return false;
    }
};

const setupConnectionHandler = (MeshTech, sessionDir, startMeshTech, callbacks = {}) => {
    // Keep reconnect state per socket. A module-global counter/timer can let a
    // previous socket consume the retry budget of a newly created socket.
    const lifecycle = {
        reconnectAttempts: 0,
        reconnectTimer: null,
    };

    const scheduleStart = (delay, label = "reconnect") => {
        if (lifecycle.reconnectTimer) return;
        lifecycle.reconnectTimer = setTimeout(async () => {
            lifecycle.reconnectTimer = null;
            try {
                await startMeshTech();
            } catch (error) {
                console.error(`[mesh-connection] ${label} startup failed:`, error.message);
                scheduleStart(RECONNECT_DELAY, "retry");
            }
        }, delay);
    };

    const handleReconnect = () => {
        if (lifecycle.reconnectTimer) return;
        if (lifecycle.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.error("Max reconnection attempts reached. Exiting for a clean supervisor restart...");
            process.exit(1);
            return;
        }
        lifecycle.reconnectAttempts += 1;
        const delay = Math.min(
            RECONNECT_DELAY * Math.pow(2, lifecycle.reconnectAttempts - 1),
            60000,
        );
        console.log(`🕗 Reconnection attempt ${lifecycle.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms...`);
        scheduleStart(delay);
    };

    MeshTech.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "connecting") {
            console.log("🕗 Connecting to Whatsapp...");
        }

        if (connection === "open") {
            lifecycle.reconnectAttempts = 0;
            if (lifecycle.reconnectTimer) {
                clearTimeout(lifecycle.reconnectTimer);
                lifecycle.reconnectTimer = null;
            }
            if (callbacks.onOpen) {
                try {
                    await callbacks.onOpen(MeshTech);
                } catch (error) {
                    console.error("[mesh-connection] onOpen callback failed:", error.message);
                }
            }
        }

        if (connection !== "close") return;

        const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
        console.log(`Connection closed due to: ${reason}`);

        if (callbacks.onDisconnect) {
            try {
                await callbacks.onDisconnect(reason);
            } catch (error) {
                console.error("[mesh-connection] onDisconnect callback failed:", error.message);
            }
        }

        switch (reason) {
            case DisconnectReason.badSession:
                console.log("Bad session file, automatically deleted...please scan again");
                try {
                    const ownerNumber = MeshTech?.user?.id?.split(":")[0];
                    if (ownerNumber) {
                        const { SessionBackupDB } = require("../database/sessionBackup");
                        await SessionBackupDB.destroy({ where: { number: ownerNumber } });
                    }
                    await fs.remove(sessionDir);
                } catch (error) {
                    console.error("Failed to remove session:", error.message);
                }
                scheduleStart(5000, "bad-session");
                break;

            case DisconnectReason.connectionReplaced:
                console.log("Connection replaced, another new session opened");
                scheduleStart(5000, "connection-replaced");
                break;

            case DisconnectReason.loggedOut:
                console.log("Device logged out, session file automatically deleted...please scan again");
                try {
                    const ownerNumber = MeshTech?.user?.id?.split(":")[0];
                    if (ownerNumber) {
                        const { SessionBackupDB } = require("../database/sessionBackup");
                        await SessionBackupDB.destroy({ where: { number: ownerNumber } });
                    }
                    await fs.remove(sessionDir);
                } catch (error) {
                    console.error("❌ Failed to remove session:", error.message);
                }
                // A logged-out account needs a fresh pairing, but the process
                // must remain alive so the dashboard can request it.
                scheduleStart(5000, "logged-out");
                break;

            case DisconnectReason.connectionClosed:
            case DisconnectReason.connectionLost:
            case DisconnectReason.restartRequired:
                console.log("🕗 Reconnecting...");
                handleReconnect();
                break;

            case DisconnectReason.timedOut:
                console.log("Connection timed out, reconnecting...");
                scheduleStart(RECONNECT_DELAY * 2, "timeout");
                break;

            default:
                console.log(`Unknown disconnect reason: ${reason}, attempting reconnection...`);
                handleReconnect();
                break;
        }
    });

    setupGroupCacheListeners(MeshTech);
    setupGroupEventsListeners(MeshTech);
};

module.exports = {
    setupConnectionHandler,
    safeNewsletterFollow,
    safeGroupAcceptInvite,
};
