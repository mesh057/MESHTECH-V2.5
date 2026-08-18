const fs = require('fs-extra');
const path = require('path');
const { evt, commands } = require('../gmdCmds');
const { standardizeJid } = require('./serializer');
const { getGroupMetadata, getLidMapping } = require('./groupCache');

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
        fs.readdirSync(pluginsPath).forEach((fileName) => {
            const ext = path.extname(fileName).toLowerCase();
            if (_pluginExts.has(ext)) {
                try {
                    require(path.join(pluginsPath, fileName));
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

const createHelpers = (Gifted, ms, from) => {
    const reply = (text, options = {}) => {
        if (typeof text === 'string') {
            Gifted.sendMessage(from, { text, ...options }, { quoted: ms });
        } else {
            Gifted.sendMessage(from, { ...text, ...options }, { quoted: ms });
        }
    };

    const react = async (emoji) => {
        if (typeof emoji !== 'string') return;
        try {
            await Gifted.sendMessage(from, { 
                react: { key: ms.key, text: emoji }
            });
        } catch (err) {
            console.error('Reaction error:', err);
        }
    };

    const edit = async (text, message) => {
        if (typeof text !== 'string') return;
        try {
            await Gifted.sendMessage(from, {
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
            await Gifted.sendMessage(from, {
                delete: message.key
            }, { quoted: ms });
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    return { reply, react, edit, del };
};

const getGroupInfo = async (Gifted, from, botId, sender) => {
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

    const groupInfo = await getGroupMetadata(Gifted, from);
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

    const participantIdentifiers = (participant) => {
        const identifiers = new Set();
        const values = [
            participant?.id,
            participant?.jid,
            participant?.pn,
            participant?.phoneNumber,
            participant?.participant,
            participant?.lid,
        ];
        for (const value of values) {
            if (!value || typeof value !== 'string') continue;
            const normalized = value.trim().toLowerCase();
            identifiers.add(normalized);
            if (normalized.includes('@')) identifiers.add(normalized.split('@')[0]);
            if (normalized.endsWith('@lid')) {
                const mapped = getLidMapping(normalized);
                if (mapped) {
                    const mappedNormalized = mapped.toLowerCase();
                    identifiers.add(mappedNormalized);
                    if (mappedNormalized.includes('@')) identifiers.add(mappedNormalized.split('@')[0]);
                }
            }
        }
        return identifiers;
    };
    const senderIdentifiers = participantIdentifiers({
        id: sender,
        jid: standardizeJid(sender),
    });
    const found = groupInfo.participants.find((participant) => {
        const identifiers = participantIdentifiers(participant);
        return [...senderIdentifiers].some((identifier) => identifiers.has(identifier));
    });
    let resolvedSender = found?.pn || found?.phoneNumber || found?.id || sender;
    if (resolvedSender.endsWith('@lid')) {
        const mapped = getLidMapping(resolvedSender);
        if (mapped) resolvedSender = mapped;
    }

    const isAdminParticipant = (participant) => (
        participant?.admin === 'admin' ||
        participant?.admin === 'superadmin' ||
        participant?.admin === true
    );
    const groupAdmins = groupInfo.participants
        .filter((participant) => participant?.admin === 'admin' || participant?.admin === true)
        .map((participant) => participant.pn || participant.phoneNumber || participant.id);
    const groupSuperAdmins = groupInfo.participants
        .filter((participant) => participant?.admin === 'superadmin')
        .map((participant) => participant.pn || participant.phoneNumber || participant.id);
    const botIdentifiers = participantIdentifiers({ id: botId, jid: standardizeJid(botId) });
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

const buildSuperUsers = async (_settings, _getSudoNumbers, botId, _ownerNumber) => {
    const botJid = standardizeJid(botId);
    return botJid ? [botJid] : [];
};

module.exports = {
    loadPlugins,
    findCommand,
    findBodyCommand,
    createHelpers,
    getGroupInfo,
    buildSuperUsers
};
