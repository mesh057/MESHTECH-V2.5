const { getContentType, downloadMediaMessage } = require('mesh-baileys');
const { getLidMapping, storeLidMapping } = require('./groupCache');

const standardizeJid = (jid) => {
    if (!jid) return '';
    try {
        jid = typeof jid === 'string' ? jid : 
            (jid.decodeJid ? jid.decodeJid() : String(jid));
        jid = jid.split(':')[0].split('/')[0];
        if (!jid.includes('@')) {
            jid += '@s.whatsapp.net';
        } else if (jid.endsWith('@lid')) {
            return jid.toLowerCase();
        }
        return jid.toLowerCase();
    } catch (e) {
        console.error('JID standardization error:', e);
        return '';
    }
};

const convertLidToJid = (lid) => {
    if (!lid) return '';
    if (!lid.endsWith('@lid')) return lid;
    const cached = getLidMapping(lid);
    if (cached) return cached;
    return lid;
};

const unwrapMessage = (msg) => {
    if (!msg) return null;
    let m = msg;
    while (m) {
        if (m.ephemeralMessage) m = m.ephemeralMessage.message;
        else if (m.viewOnceMessage) m = m.viewOnceMessage.message;
        else if (m.viewOnceMessageV2) m = m.viewOnceMessageV2.message;
        else if (m.documentWithCaptionMessage) m = m.documentWithCaptionMessage.message;
        else if (m.viewOnceMessageV2Extension) m = m.viewOnceMessageV2Extension.message;
        else break;
    }
    return m;
};

const serializeMessage = async (ms, MeshTech, settings = {}) => {
    if (!ms?.message || !ms?.key) return null;

    const botId = standardizeJid(MeshTech.user?.id);
    const actualMessage = unwrapMessage(ms.message) || ms.message;
    const type = getContentType(actualMessage);
    
    const hasEntryPointContext = 
        actualMessage?.extendedTextMessage?.contextInfo?.entryPointConversionApp === 'whatsapp' ||
        actualMessage?.imageMessage?.contextInfo?.entryPointConversionApp === 'whatsapp' ||
        actualMessage?.videoMessage?.contextInfo?.entryPointConversionApp === 'whatsapp' ||
        actualMessage?.documentMessage?.contextInfo?.entryPointConversionApp === 'whatsapp' ||
        actualMessage?.audioMessage?.contextInfo?.entryPointConversionApp === 'whatsapp';

    const isMessageYourself = hasEntryPointContext && ms.key.remoteJid.endsWith('@lid') && ms.key.fromMe;
    const from = isMessageYourself ? botId : standardizeJid(ms.key.remoteJid);
    const isGroup = from.endsWith('@g.us');
    
    let sendr = ms.key.fromMe 
        ? (MeshTech.user.id.split(':')[0] + '@s.whatsapp.net' || MeshTech.user.id) 
        : (ms.key.senderPn || ms.key.participantPn || ms.key.participantAlt || ms.key.remoteJidAlt || ms.key.remoteJid || ms.key.participant);

    // Auto-map LID to PN if both are present in the message key
    const rawParticipant = ms.key.participant || ms.participant || ms.key.remoteJid;
    const rawPn = ms.key.participantPn || ms.key.senderPn;
    
    if (rawParticipant && rawParticipant.endsWith('@lid') && rawPn) {
        const jid = rawPn.includes('@') ? rawPn : `${rawPn}@s.whatsapp.net`;
        storeLidMapping(rawParticipant, jid);
        if (sendr === rawParticipant) sendr = jid;
    }
    
    let body = '';
    let isButtonResponse = false;
    let buttonId = null;
    
    if (actualMessage?.interactiveResponseMessage) {
        isButtonResponse = true;
        try {
            const paramsJson = actualMessage.interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson;
            if (paramsJson) {
                buttonId = JSON.parse(paramsJson)?.id || null;
            }
        } catch (e) {
            buttonId = null;
        }
        if (!buttonId) {
            buttonId = actualMessage.interactiveResponseMessage.buttonId || null;
        }
        body = buttonId || actualMessage.interactiveResponseMessage?.body?.text || '';
    } else if (actualMessage?.buttonsResponseMessage?.selectedButtonId) {
        isButtonResponse = true;
        buttonId = actualMessage.buttonsResponseMessage.selectedButtonId;
        body = buttonId;
    } else if (actualMessage?.listResponseMessage?.singleSelectReply?.selectedRowId) {
        isButtonResponse = true;
        buttonId = actualMessage.listResponseMessage.singleSelectReply.selectedRowId;
        body = buttonId;
    } else if (actualMessage?.templateButtonReplyMessage?.selectedId) {
        isButtonResponse = true;
        buttonId = actualMessage.templateButtonReplyMessage.selectedId;
        body = buttonId;
    } else if (type === 'conversation') {
        body = actualMessage.conversation;
    } else if (type === 'extendedTextMessage') {
        body = actualMessage.extendedTextMessage?.text || '';
    } else if (type === 'imageMessage' && actualMessage.imageMessage?.caption) {
        body = actualMessage.imageMessage.caption;
    } else if (type === 'videoMessage' && actualMessage.videoMessage?.caption) {
        body = actualMessage.videoMessage.caption;
    }

    const botPrefix = settings.PREFIX || '.';
    const isCommand = body.startsWith(botPrefix);
    const command = isCommand ? body.slice(botPrefix.length).trim().split(' ').shift().toLowerCase() : '';
    const args = typeof body === 'string' ? body.trim().split(/\s+/).slice(1) : [];

    const repliedMessage = actualMessage?.extendedTextMessage?.contextInfo?.quotedMessage || null;
    const quoted = type == 'extendedTextMessage' && 
        actualMessage?.extendedTextMessage?.contextInfo != null 
        ? actualMessage.extendedTextMessage.contextInfo.quotedMessage || [] 
        : [];
    
    const mentionedJid = (actualMessage?.extendedTextMessage?.contextInfo?.mentionedJid || []).map(standardizeJid);
    const tagged = ms.mtype === 'extendedTextMessage' && actualMessage?.extendedTextMessage?.contextInfo != null
        ? actualMessage.extendedTextMessage.contextInfo.mentionedJid
        : [];
    
    const contextInfo = actualMessage?.extendedTextMessage?.contextInfo || 
        actualMessage?.imageMessage?.contextInfo ||
        actualMessage?.videoMessage?.contextInfo ||
        actualMessage?.audioMessage?.contextInfo ||
        actualMessage?.documentMessage?.contextInfo ||
        actualMessage?.stickerMessage?.contextInfo || null;
    
    const quotedMsg = contextInfo?.quotedMessage || null;
    const rawQuotedUser = contextInfo?.participant || contextInfo?.remoteJid;
    const quotedUser = convertLidToJid(standardizeJid(rawQuotedUser));
    const repliedMessageAuthor = convertLidToJid(standardizeJid(contextInfo?.participant));
    
    const quotedStanzaId = contextInfo?.stanzaId || null;
    const quotedKey = quotedStanzaId ? {
        remoteJid: from,
        fromMe: rawQuotedUser === botId || contextInfo?.participant === botId,
        id: quotedStanzaId,
        participant: isGroup ? rawQuotedUser : undefined
    } : null;
    
    let messageAuthor = isGroup 
        ? standardizeJid(ms.key.participant || ms.participant || from)
        : from;
    if (ms.key.fromMe) messageAuthor = botId;
    
    const user = mentionedJid.length > 0 
        ? mentionedJid[0] 
        : repliedMessage 
            ? repliedMessageAuthor 
            : '';

    return {
        ms,
        mek: ms,
        type,
        from,
        isGroup,
        sender: sendr,
        botId,
        body,
        isCommand,
        command,
        args,
        q: args.join(' '),
        pushName: ms.pushName || (ms.key.fromMe ? MeshTech.user?.name : null) || 'MESHTECH MD BOT v2.5 User',
        quoted,
        repliedMessage,
        mentionedJid,
        tagged,
        quotedMsg,
        quotedKey,
        quotedUser,
        repliedMessageAuthor,
        messageAuthor,
        user,
        prefix: botPrefix,
        isButtonResponse,
        buttonId
    };
};

module.exports = {
    standardizeJid,
    convertLidToJid,
    serializeMessage,
    downloadMediaMessage
};
