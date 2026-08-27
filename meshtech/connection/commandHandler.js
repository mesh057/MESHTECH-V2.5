const fs = require('fs-extra');
const path = require('path');
const { evt, commands, gmd } = require('../gmdCmds');
const { standardizeJid } = require('./serializer');
const { getGroupMetadata, getLidMapping } = require('./groupCache');

const participantIdentifiers = (participant) => {
    const identifiers = new Set();
    [participant?.id, participant?.jid, participant?.pn, participant?.phoneNumber, participant?.participant, participant?.lid]
        .forEach((value) => {
            if (!value || typeof value !== 'string') return;
            const normalized = value.toLowerCase();
            identifiers.add(normalized);
            if (normalized.includes('@')) {
                identifiers.add(normalized.split('@')[0]);
            }
        });
    return identifiers;
};

const _compileAsJs = function (module, filename) {
    const content = fs.readFileSync(filename, 'utf8');
    module._compile(content, filename);
};
require.extensions['.gmd']     = _compileAsJs;
require.extensions['.kasongo'] = _compileAsJs;
require.extensions['.amd']     = _compileAsJs;
require.extensions['.atassa']  = _compileAsJs;
require.extensions['.ke']      = _compileAsJs;

const _pluginExts = new Set(['.js', '.gmd', '.kasongo', '.amd', '.atassa', '.ke']);

const loadPlugins = (pluginsPath) => {
    try {
        if (!fs.existsSync(pluginsPath)) {
            console.warn(`Plugins directory not found: ${pluginsPath}`);
            return;
        }
        fs.readdirSync(pluginsPath).forEach((fileName) => {
            const ext = path.extname(fileName).toLowerCase();
            if (_pluginExts.has(ext)) {
                try {
                    const loaded = require(path.join(pluginsPath, fileName));
                    const legacy = loaded?.default || loaded;
                    if (legacy && Array.isArray(legacy.commands) && typeof legacy.execute === 'function') {
                        for (const pattern of legacy.commands) {
                            gmd({
                                pattern,
                                aliases: [],
                                category: legacy.category || 'general',
                                description: legacy.description || '',
                            }, async (from, MeshTech, context) => {
                                const message = context?.mek || {};
                                const text = context?.q || context?.body || '';
                                return legacy.execute(
                                    { chat: from, key: message.key, sender: context?.sender, ...message },
                                    { client: MeshTech, text, command: pattern, reply: context.reply }
                                );
                            });
                        }
                        console.log(`✅ Loaded legacy plugin ${fileName} (${legacy.commands.length} commands)`);
                    }
                } catch (e) {
                    console.error(`Failed to load ${fileName}: ${e.message}`);
                }
            }
        });
    } catch (error) {
        console.error('Error reading plugins folder:', error.message);
    }
};

const findCommand = (cmd) => {
    if (!Array.isArray(evt.commands)) return null;
    return evt.commands.find((c) => (
        c?.pattern === cmd || 
        (Array.isArray(c?.aliases) && c.aliases.includes(cmd))
    ));
};

const findBodyCommand = (body) => {
    if (!Array.isArray(evt.commands) || !body) return null;
    return evt.commands.find((c) => {
        if (c?.on === 'body') {
            if (typeof c.pattern === 'string') {
                return body.toLowerCase().includes(c.pattern.toLowerCase());
            }
            if (c.pattern instanceof RegExp) {
                return c.pattern.test(body);
            }
        }
        return false;
    });
};

const createHelpers = (MeshTech, ms, from) => {
    const reply = (text, options = {}) => {
        if (typeof text === 'string') {
            MeshTech.sendMessage(from, { text, ...options }, { quoted: ms });
        } else {
            MeshTech.sendMessage(from, { ...text, ...options }, { quoted: ms });
        }
    };

    const react = async (emoji) => {
        if (typeof emoji !== 'string') return;
        try {
            await MeshTech.sendMessage(from, { 
                react: { key: ms.key, text: emoji }
            });
        } catch (err) {
            console.error('Reaction error:', err);
        }
    };

    const edit = async (text, message) => {
        if (typeof text !== 'string') return;
        try {
            await MeshTech.sendMessage(from, {
                text: text,
                edit: message.key
            }, { quoted: ms });
        } catch (err) {
            console.error('Edit error:', err);
        }
    };

    const del = async (message) => {
        if (!message?.key) return;
        try {
            await MeshTech.sendMessage(from, {
                delete: message.key
            }, { quoted: ms });
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    return { reply, react, edit, del };
};

const getGroupInfo = async (MeshTech, from, botId, sender) => {
    const isGroup = from.endsWith('@g.us');
    if (!isGroup) {
        return {
            groupInfo: null,
            groupName: '',
            participants: [],
            groupAdmins: [],
            groupSuperAdmins: [],
            isBotAdmin: false,
            isAdmin: false,
            isSuperAdmin: false,
            sender
        };
    }

    let groupInfo = await getGroupMetadata(MeshTech, from);
    if (!groupInfo || !groupInfo.participants) {
        try {
            groupInfo = await MeshTech.groupMetadata(from);
        } catch (e) {}
    }
    if (!groupInfo || !groupInfo.participants) {
        return {
            groupInfo: null,
            groupName: '',
            participants: [],
            groupAdmins: [],
            groupSuperAdmins: [],
            isBotAdmin: false,
            isAdmin: false,
            isSuperAdmin: false,
            sender
        };
    }

    // Fast O(1) or O(N) lookup without creating massive Set objects per message
    const cleanSender = sender.trim().toLowerCase().split('@')[0];
    const found = groupInfo.participants.find((p) => {
        const pid = (p.id || p.jid || p.pn || p.phoneNumber || '').trim().toLowerCase().split('@')[0];
        return pid === cleanSender;
    });
    let resolvedSender = found?.pn || found?.phoneNumber || found?.id || sender;

    const isAdminParticipant = (participant) => (
        participant?.admin === 'admin' ||
        participant?.admin === 'superadmin' ||
        participant?.admin === true
    );
    const resolveRealNumber = (participant) => {
        const raw = participant.pn || participant.phoneNumber || participant.id;
        if (raw && raw.endsWith('@lid')) {
            const mapped = getLidMapping(raw);
            if (mapped) return mapped;
        }
        return raw;
    };

    const groupAdmins = groupInfo.participants
        .filter((participant) => participant?.admin === 'admin' || participant?.admin === true)
        .map(resolveRealNumber);
    const groupSuperAdmins = groupInfo.participants
        .filter((participant) => participant?.admin === 'superadmin')
        .map(resolveRealNumber);
    
    const botIdentifiers = participantIdentifiers({ id: botId, jid: standardizeJid(botId) });
    const senderIdentifiers = participantIdentifiers({ id: sender, jid: standardizeJid(sender) });

    const isBotAdmin = groupInfo.participants.some((participant) => {
        if (!isAdminParticipant(participant)) return false;
        const identifiers = participantIdentifiers(participant);
        return [...botIdentifiers].some((identifier) => identifiers.has(identifier));
    });
    const isAdmin = groupInfo.participants.some((participant) => {
        if (!isAdminParticipant(participant)) return false;
        const identifiers = participantIdentifiers(participant);
        return [...senderIdentifiers].some((identifier) => identifiers.has(identifier));
    });
    const isSuperAdmin = groupInfo.participants.some((participant) => {
        if (participant?.admin !== 'superadmin') return false;
        const identifiers = participantIdentifiers(participant);
        return [...senderIdentifiers].some((identifier) => identifiers.has(identifier));
    });

    return {
        groupInfo,
        groupName: groupInfo.subject || '',
        participants: groupInfo.participants,
        groupAdmins,
        groupSuperAdmins,
        isBotAdmin,
        isAdmin,
        isSuperAdmin,
        sender: resolvedSender
    };
};

const buildSuperUsers = async (settings, getSudoNumbers, botId, ownerNumber) => {
    const superUsers = new Set();
    
    // 1. Add Bot ID
    const botJid = standardizeJid(botId);
    if (botJid) superUsers.add(botJid);
    
    // 2. Add Configured Owner Number
    const owner = ownerNumber || settings?.OWNER_NUMBER;
    if (owner) {
        const ownerJid = standardizeJid(owner);
        if (ownerJid) superUsers.add(ownerJid);
    }
    
    // 3. Add Sudo Numbers from DB
    if (typeof getSudoNumbers === 'function') {
        try {
            const sudoList = await getSudoNumbers();
            if (Array.isArray(sudoList)) {
                sudoList.forEach(num => {
                    const jid = standardizeJid(num);
                    if (jid) superUsers.add(jid);
                });
            }
        } catch (e) {
            console.error('Error fetching sudo numbers:', e);
        }
    }
    
    return Array.from(superUsers);
};

module.exports = {
    loadPlugins,
    findCommand,
    findBodyCommand,
    createHelpers,
    getGroupInfo,
    buildSuperUsers
};
