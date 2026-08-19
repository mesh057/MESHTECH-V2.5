require("events").EventEmitter.defaultMaxListeners = 960;
require("./meshtech/gmdHelpers");

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception thrown:', err);
});

const {
    default: giftedConnect,
    isJidGroup,
    jidNormalizedUser,
    isJidBroadcast,
    downloadMediaMessage,
    downloadContentFromMessage,
    getContentType,
    fetchLatestWaWebVersion,
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
    GiftedAutoReact,
    GiftedAntiLink,
    GiftedAntibad,
    GiftedAntiGroupMention,
    GiftedAutoBio,
    handleGameMessage,
    GiftedChatBot,
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
    uploadToGiftedCdn,
    uploadToCatbox,
    GiftedAnticall,
    antiStickerHandler,
    createContext,
    createContext2,
    monospace,
    verifyJidState,
    GiftedPresence,
    GiftedAntiDelete,
    GiftedAntiEdit,
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

async function resolveMeshTechChannel(Gifted) {
    const channelUrl = process.env.MESHTECH_CHANNEL_URL || MESHTECH_CHANNEL_URL;
    const inviteCode = channelUrl.match(/whatsapp\.com\/channel\/([^/?#]+)/i)?.[1];
    if (!inviteCode || typeof Gifted?.newsletterMetadata !== "function") return null;
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
const { SESSION_ID: sessionId } = config;
const PORT = process.env.PORT || 5000;
const embeddedHttpServerEnabled = process.env.MESH_DISABLE_HTTP_SERVER !== "true";
const app = express();
let Gifted;
let store;

logger.level = "silent";
app.use(express.static("meshtech"));
app.get("/", (req, res) => res.sendFile(__dirname + "/meshtech/meshtech.html"));
app.get("/health", (req, res) =>
    res.status(200).json({ status: "alive", uptime: process.uptime() }),
);
if (embeddedHttpServerEnabled) {
    app.listen(PORT, () => console.log(`✅ Server Running on Port: ${PORT}`));
} else {
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
            if (Gifted?.user?.id) {
                await MeshTech.sendPresenceUpdate("available");
            }
        } catch (e) {}
    }, 30000);
}

const sessionDir = path.resolve(process.env.AUTH_DIR || config.AUTH_DIR || path.join(__dirname, "meshtech", "session"));
const pluginsPath = path.join(__dirname, "commands");

let botSettings = {};
async function loadBotSettings() {
    await syncDatabase();
    await initializeSettings();
    await initializeGroupSettings();
    botSettings = await getAllSettings();
    return botSettings;
}

startCleanup();

async function startGifted() {
    try {
        // Add a timeout to version fetching to prevent pairing delays
        const { version } = await Promise.race([
            fetchLatestWaWebVersion(),
            new Promise(resolve => setTimeout(() => resolve({ version: [2, 3000, 1015901307] }), 4000))
        ]);
        const sessionDbPath = path.resolve(process.env.SESSION_DB_FILE || config.SESSION_DB_FILE || path.join(sessionDir, "session.db"));
        const { state, saveCreds } = await useSQLiteAuthState(sessionDbPath);

        if (store) store.destroy();
        store = new SQLiteStore();

        const socketConfig = createSocketConfig(version, state, logger);
        socketConfig.getMessage = async (key) => {
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id);
                return msg?.message || undefined;
            }
            return { conversation: "Error occurred" };
        };

        Gifted = giftedConnect(socketConfig);
        store.bind(MeshTech.ev);

        let pairingRequested = false;
        let pairingInFlight = false;
        const requestPairingCode = async () => {
            if (pairingRequested || pairingInFlight || state.creds.registered || process.env.MESH_PAIRING_MODE === "qr") return;
            const phoneNumber = String(process.env.MESH_PAIRING_PHONE_NUMBER || "").replace(/\D/g, "");
            if (!/^\d{8,15}$/.test(phoneNumber)) {
                console.error("PAIRING_ERROR Invalid phone number. Use country code plus number, digits only, with no + sign.");
                pairingRequested = true;
                return;
            }
            pairingInFlight = true;
            try {
                if (Gifted?.user?.id) return;
                // Wait briefly to ensure WebSocket is open and ready for pairing IQ
                await new Promise(r => setTimeout(r, 2000));
                const pairingCode = await MeshTech.requestPairingCode(phoneNumber);
                pairingRequested = true;
                console.log(`PAIRING_CODE ${pairingCode}`);
            } catch (pairingError) {
                console.error(`PAIRING_ERROR ${pairingError.message}`);
                pairingInFlight = false;
                // Retry pairing request after 3 seconds if connection was not yet open
                setTimeout(requestPairingCode, 3000);
                return;
            }
            pairingInFlight = false;
        };

        MeshTech.ev.on("connection.update", ({ connection }) => {
            if (connection === "connecting" || connection === "open") {
                setTimeout(requestPairingCode, 1000);
            }
        });

        if (!state.creds.registered && process.env.MESH_PAIRING_PHONE_NUMBER && process.env.MESH_PAIRING_MODE !== "qr") {
            setTimeout(requestPairingCode, 1500);
        }

        MeshTech.ev.process(async (events) => {
            if (events["creds.update"]) await saveCreds();
        });

        setupAutoReact(Gifted);
        setupAntiDelete(Gifted);
        setupAutoBio(Gifted);
        setupAntiCall(Gifted);
        setupNewsletterReact(Gifted);
        setupPresence(Gifted);
        setupChatBotAndAntiLink(Gifted);
        setupAntiEdit(Gifted);
        setupStatusHandlers(Gifted);
        setupGroupEventsListeners(Gifted);

        // Background plugin loading to prevent blocking the event loop during pairing
        setTimeout(() => {
            console.log("ℹ️ Loading plugins in background...");
            loadPlugins(pluginsPath);
            setupCommandHandler(Gifted);
            console.log("✅ Plugins loaded.");
        }, 1000);

        setupConnectionHandler(MeshTech, sessionDir, startMeshTech, {
            onOpen: async (Gifted) => {
                const s = await getAllSettings();
                
                // Background task to avoid blocking connection
                (async () => {
                    try {
                        if (!Gifted?.user?.id) return;
                        
                        // Ensure presence is set to available on start
                        await MeshTech.sendPresenceUpdate("available");
                        
                        // Resolve channel metadata in the background
                        void resolveMeshTechChannel(Gifted);
                        
                        if (s.NEWSLETTER_JID) await safeNewsletterFollow(MeshTech, s.NEWSLETTER_JID);
                        if (s.GC_JID) await safeGroupAcceptInvite(MeshTech, s.GC_JID);
                        await initializeLidStore(Gifted);
                    } catch (err) {
                        console.error("Error in onOpen post-connect handler:", err);
                    }
                })();

                setTimeout(async () => {
                    try {
                        if (!Gifted?.user?.id) return;
                        const activeOwnerNumber = Gifted.user.id.split(":")[0];
                        const totalCommands = commands.filter(
                            (c) => c.pattern && !c.dontAddCommandList,
                        ).length;
                        console.log("💜 Connected to Whatsapp, Active!");

                        if (s.STARTING_MESSAGE === "true") {
                            const d = DEFAULT_SETTINGS;
                            const md =
                                s.MODE === "public" ? "public" : "private";
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
	await sendButtons(MeshTech, Gifted.user.id, {
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

                            
                        }
                    } catch (err) {
                        console.error("Post-connection setup error:", err);
                    }
                }, 5000);
            },
        });

        process.on("SIGINT", () => store?.destroy());
        process.on("SIGTERM", () => store?.destroy());
    } catch (error) {
        console.error("Socket initialization error:", error);
        setTimeout(() => startGifted(), 5000);
    }
}

function setupAutoReact(Gifted) {
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
            await GiftedAutoReact(randomEmoji, ms, Gifted);
        } catch (err) {
            console.error("Error during auto reaction:", err);
        }
    });
}

function setupAntiDelete(Gifted) {
    const botJid = `${Gifted.user?.id.split(":")[0]}@s.whatsapp.net`;
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

                    await GiftedAntiDelete(
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
	await GiftedAntiViewOnce(MeshTech, ms);

	/* ✅ RUN ONLY IF MESSAGE IS STICKER */
const isSticker =
    ms.message?.stickerMessage ||
    ms.message?.ephemeralMessage?.message?.stickerMessage ||
    ms.message?.viewOnceMessageV2?.message?.stickerMessage;

				/* 🚀 RUN ONLY IN GROUPS + STICKERS */
				if (isGroup && isSticker) {
    				await antiStickerHandler(ms, Gifted);
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

function setupAutoBio(Gifted) {
    (async () => {
        const s = await getAllSettings();
        if (s.AUTO_BIO === "true") {
            setTimeout(() => GiftedAutoBio(Gifted), 1000);
            setInterval(() => GiftedAutoBio(Gifted), 1000 * 60);
        }
    })();
}

function setupAntiCall(Gifted) {
    MeshTech.ev.on("call", async (json) => {
        await GiftedAnticall(json, Gifted);
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

function setupNewsletterReact(Gifted) {
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

function setupPresence(Gifted) {
    MeshTech.ev.on("messages.upsert", async ({ messages }) => {
        if (Gifted?.user?.id && messages?.length > 0 && messages[0]?.key?.remoteJid) {
            await GiftedPresence(MeshTech, messages[0].key.remoteJid);
        }
    });

    MeshTech.ev.on("connection.update", ({ connection }) => {
        if (connection === "open" && Gifted?.user?.id) {
            GiftedPresence(MeshTech, "status@broadcast");
        }
    });
}

function setupChatBotAndAntiLink(Gifted) {
    MeshTech.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type === "append") return;

        const firstMsg = messages[0];
        if (firstMsg?.message) {
            const s = await getAllSettings();
            if (s.CHATBOT === "true" || s.CHATBOT === "audio") {
                GiftedChatBot(
                    MeshTech,
                    s.CHATBOT,
                    s.CHATBOT_MODE || "inbox",
                    createContext,
                    createContext2,
                    googleTTS,
                );
            }
        }

        for (const message of messages) {
            if (!message?.message) continue;
            const from = message.key?.remoteJid || "";
            if (message.key.fromMe && !from.endsWith("@g.us")) continue;

            if (from.endsWith("@g.us")) {
                await GiftedAntiLink(MeshTech, message, getGroupMetadata);
                await GiftedAntibad(MeshTech, message, getGroupMetadata);
            }
            await GiftedAntiGroupMention(MeshTech, message, getGroupMetadata);
            await handleGameMessage(MeshTech, message);
        }
    });
}

function setupAntiEdit(Gifted) {
    MeshTech.ev.on("messages.update", async (updates) => {
        for (const update of updates) {
            try {
                if (!update?.update?.message) continue;
                if (update.key?.fromMe) continue;
                if (update.key?.remoteJid === "status@broadcast") continue;
                await GiftedAntiEdit(MeshTech, update, findAntiDelete);
            } catch (err) {
                console.error("Anti-edit handler error:", err.message);
            }
        }
    });
}

function setupStatusHandlers(Gifted) {
    MeshTech.ev.on("messages.upsert", async (mek) => {
        try {
            mek = mek.messages[0];
            if (!mek || !mek.message) return;

            mek.message =
                getContentType(mek.message) === "ephemeralMessage"
                    ? mek.message.ephemeralMessage.message
                    : mek.message;

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

function setupCommandHandler(Gifted) {
    MeshTech.ev.on("messages.upsert", async ({ messages, type }) => {
        if (!Array.isArray(messages)) return;

        const settings = await getAllSettings();
        const botId = standardizeJid(Gifted.user?.id);

        for (const ms of messages) {
            if (!ms?.message || !ms?.key) continue;

            const messageId = ms.key.id;
            if (processedMessages.has(messageId)) continue;
            processedMessages.add(messageId);

            setTimeout(() => processedMessages.delete(messageId), 60000);

            const serialized = await serializeMessage(ms, MeshTech, settings);
            if (!serialized) continue;

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

        rememberRecipient(from);
        rememberActivity(from);
        const groupData = await getGroupInfo(MeshTech, from, botId, rawSender);
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

        const superUser = await buildSuperUsers(
            settings,
            getSudoNumbers,
            botId,
            settings.OWNER_NUMBER || "",
        );
        const isSuperUser = superUser.includes(sender);
        const configuredPrimaryOwner = standardizeJid(settings.OWNER_NUMBER || "");
        const isPrimaryOwner = configuredPrimaryOwner
            ? configuredPrimaryOwner === sender
            : isSuperUser;

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
            if (settings.MODE?.toLowerCase() === "private" && !isSuperUser)
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
                    sender,
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
                });
                await bodyCmd.function(from, MeshTech, conText);
            } catch (error) {
                console.error(`Body command error:`, error);
            }
        }

        if (isCommand && command) {
            const gmd = findCommand(command);
            if (!gmd) return;

            if (settings.MODE?.toLowerCase() === "private" && !isSuperUser)
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

                setupGiftedHelpers(MeshTech, from);

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
                    sender,
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
                });

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

function setupGiftedHelpers(MeshTech, from) {
    Gifted.getJidFromLid = async (lid) => {
        const groupMetadata = await getGroupMetadata(MeshTech, from);
        if (!groupMetadata) return null;
        const match = groupMetadata.participants.find(
            (p) => p.lid === lid || p.id === lid,
        );
        return match?.pn || match?.phoneNumber || null;
    };

    Gifted.getLidFromJid = async (jid) => {
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

    Gifted.downloadAndSaveMediaMessage = async (
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
        ownerNumber: MeshTech?.user?.id ? Gifted.user.id.split(":")[0] : "254746844168",
        ownerName: settings.OWNER_NAME,
        botName: settings.BOT_NAME,
        giftedRepo: settings.BOT_REPO,
        packName: settings.PACK_NAME,
        packAuthor: settings.PACK_AUTHOR,
        isSuperAdmin: data.isSuperAdmin,
        getMediaBuffer,
        getFileContentType,
        bufferToStream,
        uploadToPixhost,
        uploadToImgBB,
        setCommitHash,
        getCommitHash,
        uploadToGithubCdn,
        uploadToGiftedCdn,
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
    await loadSession();
    // Start settings load in background so pairing can start immediately
    loadBotSettings().catch(err => console.error("Settings Load Error:", err));
    startGifted();
})();
