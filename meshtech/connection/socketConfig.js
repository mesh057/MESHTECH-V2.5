const pino = require('pino');
const NodeCache = require('node-cache');
const { makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const { cachedGroupMetadata } = require('./groupCache');

const _userDevicesCache = new NodeCache({ stdTTL: 1800, useClones: false });

const createSocketConfig = (version, state, logger) => {
    return {
        version,
        logger: pino({ level: 'silent' }),
        // Keep the standard Web/Ubuntu identity for device linking.
        browser: ['Ubuntu', 'Chrome', '22.04.4'],
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        cachedGroupMetadata,
        userDevicesCache: _userDevicesCache,
        // Track retry receipts so missing-message retries can be requested
        // without relaying a fabricated placeholder message.
        msgRetryCounterCache: new NodeCache({ stdTTL: 600, useClones: false }),
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
            // Returning a truthy fake message consumes the retry attempt and
            // can leave recipients stuck on “Waiting for this message”.
            return undefined;
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
