const path = require('path');
const { createMeshTechSessionId } = require('../meshtech/sessionId');

gmd(
  {
    pattern: 'session',
    aliases: ['sessionid', 'getsession'],
    react: '🔐',
    category: 'owner',
    description: 'Generate a portable session ID for recovery after storage loss.',
  },
  async (from, Gifted, conText) => {
    const { mek, react, reply, isSuperUser, botFooter } = conText;
    if (!isSuperUser) return reply('❌ This command is restricted to the bot owner.');

    try {
      const authInfoDir = process.env.SESSION_DB_FILE
        ? path.dirname(process.env.SESSION_DB_FILE)
        : path.resolve(process.env.AUTH_DIR || path.join(__dirname, '..', 'meshtech', 'session'));
      const sessionId = createMeshTechSessionId(authInfoDir);
      if (!sessionId) return reply('❌ No registered credentials were found. Pair the account first, then try again.');

      await Gifted.sendMessage(from, {
        text: `╭━━━〔 *SESSION RECOVERY* 〕━━━┈⊷\n┃ 🔐 *MeshTech session backup is ready.*\n┃\n┃ 1. Copy the session ID in the next message.\n┃ 2. Store it as a private SESSION_ID hosting secret.\n┃ 3. Never post it in chats, screenshots, menus, or public logs.\n┃\n┃ 💡 It is intended for recovery after storage loss or migration.\n╰━━━━━━━━━━━━━━━━━━━━━━┈⊷\n> *${botFooter || 'Keep this value private.'}*`,
      }, { quoted: mek });
      await Gifted.sendMessage(from, { text: sessionId }, { quoted: mek });
      await react('✅');
    } catch (error) {
      await reply(`❌ Session generation failed: ${error.message}`);
    }
  },
);
