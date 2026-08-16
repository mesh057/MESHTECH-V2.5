const { gmd, commands } = require('../meshtech/gmdCmds');

const USAGE_OVERRIDES = {
  alive: 'alive',
  menu: 'menu',
  list: 'list',
  gpt: 'gpt <question>',
  tiktok: 'tiktok <TikTok URL>',
  animal: 'animal [cat|dog]',
  meme: 'meme',
  quote: 'quote',
  trivia: 'trivia',
  trt: 'trt <text>',
  truthordare: 'truthordare',
  riddle: 'riddle',
  dall: 'dall <image prompt>',
  bing: 'bing <search terms>',
  pinterest: 'pinterest <search terms>',
  nation: 'nation <country>',
  session: 'session',
};

function cleanDescription(command) {
  return String(command.description || 'No explanation has been added yet.')
    .replace(/\s+/g, ' ')
    .trim();
}

function usageFor(command, prefix) {
  const name = String(command.pattern || '').toLowerCase();
  const usage = command.usage || USAGE_OVERRIDES[name] || name;
  return usage.startsWith(prefix) ? usage : `${prefix}${usage}`;
}

function uniqueCommands() {
  const seen = new Set();
  return commands
    .filter((command) => command?.pattern && !command.dontAddCommandList)
    .filter((command) => {
      const key = String(command.pattern).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => String(a.pattern).localeCompare(String(b.pattern)));
}

function commandExplanation(command, prefix) {
  const aliases = Array.isArray(command.aliases) && command.aliases.length
    ? `\nAliases: ${command.aliases.map((alias) => `${prefix}${alias}`).join(', ')}`
    : '';
  return `╭─ *${prefix}${command.pattern}*\n│ Meaning: ${cleanDescription(command)}\n│ Usage: ${usageFor(command, prefix)}${aliases}\n╰────────────`;
}

gmd(
  {
    pattern: 'help',
    aliases: ['h'],
    react: '📖',
    category: 'general',
    description: 'Explain what commands do and show how to use them. Use `.help command` for one command or `.help all` for the full guide.',
  },
  async (from, Gifted, conText) => {
    const { args, botPrefix, botFooter, react, reply, mek } = conText;
    const prefix = botPrefix || '.';
    const requested = String(args?.[0] || '').trim().toLowerCase().replace(/^[.!#/]/, '');
    const allCommands = uniqueCommands();

    if (requested && requested !== 'all') {
      const command = allCommands.find((item) =>
        String(item.pattern).toLowerCase() === requested ||
        (Array.isArray(item.aliases) && item.aliases.some((alias) => String(alias).toLowerCase() === requested))
      );
      if (!command) return reply(`❌ No explanation found for *${prefix}${requested}*. Use ${prefix}help all to browse every command.`);
      await Gifted.sendMessage(from, {
        text: `╔═❖•⊰ *COMMAND EXPLANATION* ⊱•❖═╗\n${commandExplanation(command, prefix)}\n\n💡 Use ${prefix}menu for the categorized command browser.\n╚═══════════════════╝\n> *${botFooter || 'MESHTECH MD BOT'}*`,
      }, { quoted: mek });
      return react('📖');
    }

    const entries = allCommands.map((command, index) => `${index + 1}. ${commandExplanation(command, prefix)}`);
    const pages = [];
    let page = '';
    for (const entry of entries) {
      if ((page + '\n\n' + entry).length > 3600 && page) {
        pages.push(page);
        page = '';
      }
      page += `${page ? '\n\n' : ''}${entry}`;
    }
    if (page) pages.push(page);

    if (!pages.length) return reply('❌ No command explanations are currently available.');
    await Gifted.sendMessage(from, {
      text: `╔═❖•⊰ *DETAILED COMMAND HELP* ⊱•❖═╗\n│ Page 1/${pages.length}\n│ Meaning + usage for every loaded command\n╚═══════════════════╝\n\n${pages[0]}\n\n📌 Use ${prefix}help <command> for one command.\n📂 Use ${prefix}menu for the categorized menu.\n> *${botFooter || 'MESHTECH MD BOT'}*`,
    }, { quoted: mek });
    for (let index = 1; index < pages.length; index += 1) {
      await Gifted.sendMessage(from, {
        text: `╔═❖•⊰ *DETAILED COMMAND HELP* ⊱•❖═╗\n│ Page ${index + 1}/${pages.length}\n╚═══════════════════╝\n\n${pages[index]}`,
      });
    }
    await react('📖');
  },
);
