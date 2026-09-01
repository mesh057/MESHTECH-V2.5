const pino = require('pino');
const NodeCache = require('node-cache');
const { makeCacheableSignalKeyStore } = require('mesh-baileys');
const { cachedGroupMetadata } = require('./groupCache');

const _userDevicesCache = new NodeCache({ stdTTL: 1800, useClones: false });

const createSocketConfig = (version, state, logger) => {
    return {
        version,
        logger: pino({ level: 'silent' }),
        // WhatsApp phone-number pairing is sensitive to the browser fingerprint.
        // Keep this aligned with scripts/patch-mesh-baileys-platform.js.
        browser: ['Mac OS', 'Chrome', '14.4.1'],
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        cachedGroupMetadata,
        userDevicesCache: _userDevicesCache,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 30000,
        keepAliveIntervalMs: 20000,
        fireInitQueries: false,
        markOnlineOnConnect: true,
        syncFullHistory: true,
        shouldSyncHistoryMessage: () => true,
        retryRequestDelayMs: 500,
        maxMsgRetryCount: 10,
        generateHighQualityLinkPreview: false,
        getMessage: async (key) => {
            // Provide message store retrieval so Baileys can decrypt incoming messages correctly
            try {
                if (global.messageStore && typeof global.messageStore.loadMessage === 'function') {
                    const msg = await global.messageStore.loadMessage(key.remoteJid, key.id);
                    if (msg) return msg;
                }
            } catch (e) {}
            return { conversation: 'Hello, MESH-TECH MD is active!' };
        },
        emitOwnEvents: true,
        patchMessageBeforeSending: (message) => {
            const requiresPatch = !!(
                message.buttonsMessage ||
                message.templateMessage ||
                message.listMessage
            );
            if (requiresPatch) {
                message = {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadataVersion: 2,
                                deviceListMetadata: {},
                            },
                            ...message,
                        },
                    },
                };
            }
            return message;
        }
    };
};

module.exports = { createSocketConfig };
