const { gmd, commands } = require('../meshtech/gmdCmds');

// Number examples use the reference number supplied in the user's screenshot.
const REFERENCE_NUMBER = '254746844168';

const USAGE_OVERRIDES = {
  accept: `accept ${REFERENCE_NUMBER}`,
  add: `add ${REFERENCE_NUMBER}`,
  block: `block ${REFERENCE_NUMBER}`,
  demote: `demote ${REFERENCE_NUMBER}`,
  kick: `kick ${REFERENCE_NUMBER}`,
  promote: `promote ${REFERENCE_NUMBER}`,
  unblock: `unblock ${REFERENCE_NUMBER}`,
  warn: `warn ${REFERENCE_NUMBER}`,
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
    .replace(/\s*(?:usage|how to use|example)\s*:\s*.*$/i, '')
    .replace(/\s*aliases?\s*:\s*.*$/i, '')
    .trim();
}

function usageFor(command, prefix) {
  const name = String(command.pattern || '').toLowerCase();
  const rawUsage = command.usage || USAGE_OVERRIDES[name] || name;
  const usage = String(rawUsage).replace(/^[.!#/]/, '');
  return `${prefix}${usage}`;
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

function helpHeader(pageNumber, totalPages) {
  return `┌─❖•ঌ *DETAILED COMMAND HELP* ঌ•❖─┐\n│ Page ${pageNumber}/${totalPages}\n│ Meaning + usage for every loaded command\n└────────────────────────────`;
}

function commandExplanation(command, prefix, number) {
  const aliases = Array.isArray(command.aliases) && command.aliases.length
    ? `\n│ Aliases: ${command.aliases.map((alias) => `${prefix}${alias}`).join(', ')}`
    : '';
  return `${number}. ┌─ *${prefix}${command.pattern}*\n│ Meaning: ${cleanDescription(command)}\n│ Usage: ${usageFor(command, prefix)}${aliases}\n└────────────────────`;
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
      const body = `${helpHeader(1, 1)}\n\n${commandExplanation(command, prefix, 1)}\n\n📂 Use ${prefix}menu for the categorized command browser.`;
      await Gifted.sendMessage(from, {
        text: `${body}\n> *${botFooter || 'MESHTECH MD BOT'}*`,
      }, { quoted: mek });
      return react('📖');
    }

    const entries = allCommands.map((command, index) => commandExplanation(command, prefix, index + 1));
    const pages = [];
    let page = '';
    for (const entry of entries) {
      if ((page + '\n\n' + entry).length > 3500 && page) {
        pages.push(page);
        page = '';
      }
      page += `${page ? '\n\n' : ''}${entry}`;
    }
    if (page) pages.push(page);

    if (!pages.length) return reply('❌ No command explanations are currently available.');
    for (let index = 0; index < pages.length; index += 1) {
      const footer = index === 0
        ? `\n\n📌 Use ${prefix}help <command> for one command.\n📂 Use ${prefix}menu for the categorized menu.`
        : '';
      await Gifted.sendMessage(from, {
        text: `${helpHeader(index + 1, pages.length)}\n\n${pages[index]}${footer}${index === pages.length - 1 ? `\n> *${botFooter || 'MESHTECH MD BOT'}*` : ''}`,
      }, index === 0 ? { quoted: mek } : undefined);
    }
    await react('📖');
  },
);
