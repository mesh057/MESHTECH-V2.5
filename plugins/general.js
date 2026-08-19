const { gmd, commands, monospace, formatBytes } = require("../meshtech"),
  toBold = (text) => {
    const boldChars = {
      'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷', 'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁', 'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
      'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝', 'K': '𝗞', 'L': '𝗟', 'M': '𝗺', 'N': '𝗻', 'O': '𝗼', 'P': '𝗽', 'Q': '𝗤', 'R': '𝗿', 'S': '𝘀', 'T': '𝘁', 'U': '𝘂', 'V': '𝘃', 'W': '𝘄', 'X': '𝗑', 'Y': '𝘆', 'Z': '𝘇',
      '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
    };
    return text.split('').map(c => boldChars[c] || c).join('');
  },
  fs = require("fs"),
  path = require("path"),
  axios = require("axios"),
  BOT_START_TIME = Date.now(),
  { totalmem: totalMemoryBytes, freemem: freeMemoryBytes } = require("os"),
  moment = require("moment-timezone"),
  more = String.fromCharCode(8206),
  readmore = more.repeat(4001),
  ram = `${formatBytes(freeMemoryBytes)}/${formatBytes(totalMemoryBytes)}`;
const { sendButtons } = require("mesh-btns");
const { getSetting } = require("../meshtech/database/settings");
const { getActiveUserCount } = require("../meshtech/broadcastRegistry");
const MESHTECH_LOGO_URL = "https://i.postimg.cc/vHZz7VWG/bot-logo.png";

const COMMAND_EMOJIS = {
  owner: "🐦‍🔥",
  download: "📷",
  group: "👥",
  auto: "⚙️",
  ai: "🧠",
  github: "🐙",
  logo: "🎨",
  tools: "🛠️",
  text: "📝",
  utility: "🔧",
  converter: "💐",
  cpanel: "💐",
  downloader: "💐",
  notes: "💐",
  religion: "💐",
  search: "💐",
  sports: "💐",
  tempmail: "💐",
  uploader: "💐",
  exploits: "⚡",
  photo: "🖼️",
  react: "💐",
  game: "🎮",
  fun: "🎉",
  anime: "🌸",
  general: "✨",
};

function commandEmoji(command) {
  const category = String(command.category || "general").toLowerCase();
  return COMMAND_EMOJIS[category] || "💐";
}

const MENU_CATEGORY_ORDER = [
  "ai", "converter", "cpanel", "downloader", "game", "general", "group", "logo",
  "notes", "owner", "religion", "search", "sports", "tempmail", "tools", "uploader", "utility",
];

const MENU_CATEGORY_META = {
  ai: { label: "AI Menu", emoji: "🧠" },
  converter: { label: "Converter Menu", emoji: "💐" },
  cpanel: { label: "CPanel Menu", emoji: "💐" },
  downloader: { label: "Downloader Menu", emoji: "💐" },
  game: { label: "Game Menu", emoji: "🎮" },
  general: { label: "General Menu", emoji: "✨" },
  group: { label: "Group Menu", emoji: "👥" },
  logo: { label: "Logo Menu", emoji: "🎨" },
  notes: { label: "Notes Menu", emoji: "💐" },
  owner: { label: "Owner Menu", emoji: "🐦‍🔥" },
  religion: { label: "Religion Menu", emoji: "💐" },
  search: { label: "Search Menu", emoji: "💐" },
  sports: { label: "Sports Menu", emoji: "💐" },
  tempmail: { label: "Tempmail Menu", emoji: "💐" },
  tools: { label: "Tools Menu", emoji: "🛠️" },
  uploader: { label: "Uploader Menu", emoji: "💐" },
  utility: { label: "Utility Menu", emoji: "🔧" },
};

function menuCategoryKey(value) {
  const key = String(value || "general").toLowerCase();
  return MENU_CATEGORY_META[key] ? key : "utility";
}

function menuCategoryMeta(value) {
  const key = menuCategoryKey(value);
  return { key, ...(MENU_CATEGORY_META[key] || MENU_CATEGORY_META.utility) };
}

gmd(
  {
    pattern: "join",
    aliases: ["joinus", "groupinvite"],
    react: "🔗",
    category: "general",
    description: "Request the owner’s group invite link",
  },
  async (from, MeshTech, conText) => {
    const { reply, react, botName, botFooter } = conText;
    const inviteLink = await getSetting("GROUP_INVITE_LINK");
    if (!inviteLink) {
      return reply("ℹ️ The owner has not configured a group invite yet.");
    }
    await MeshTech.sendMessage(from, {
      text: `🔗 *${botName || "MESH TECH MD"}* GROUP INVITE\n\nYou requested to join the owner’s group. Tap the link below to join voluntarily:\n\n${inviteLink}\n\n> *${botFooter || "Please join only if you agree."}*`,
    });
    await react("✅");
  },
);

gmd(
  {
    pattern: "ping",
    aliases: ["pi", "p"],
    react: "⚡",
    category: "general",
    description: "Check bot response speed",
  },
  async (from, MeshTech, conText) => {
    const {
      react,
      newsletterUrl,
      botFooter,
      botPrefix,
    } = conText;
    const startTime = process.hrtime();

    await new Promise((resolve) =>
      setTimeout(resolve, Math.floor(80 + Math.random() * 420)),
    );

    const elapsed = process.hrtime(startTime);
    const responseTime = Math.floor(elapsed[0] * 1000 + elapsed[1] / 1000000);
        const pingText = `⚡ Pong: ${responseTime}ms`;
    const pingButtons = [
      { id: `${botPrefix}uptime`, text: "↶ ⏱️ Uptime" }
    ];
    
    const validNewsletterUrl = /^https?:\/\//i.test(String(newsletterUrl || ""));
    if (validNewsletterUrl) {
      pingButtons.push({ id: newsletterUrl, text: "🔗 WaChannel" });
    }

    try {
      await sendButtons(MeshTech, from, {
        title: "Bot Speed",
        text: pingText,
        footer: "| POWERED BY Mesh Tech",
        buttons: pingButtons,
      }, { quoted: conText.mek });
    } catch (error) {
      console.error("Ping interactive response failed:", error.message);
      await MeshTech.sendMessage(from, {
        text: `*Bot Speed*\n\n${pingText}\n\n| POWERED BY Mesh Tech`,
      }, { quoted: conText.mek });
    }

    try {
      await react("✅");
    } catch (error) {
      console.error("Ping reaction failed:", error.message);
    }
  },
);

gmd(
  {
    pattern: "report",
    aliases: ["request"],
    react: "💫",
    description: "Request New Features.",
    category: "owner",
  },
  async (from, MeshTech, conText) => {
    const { mek, q, sender, react, pushName, botPrefix, isSuperUser, reply } =
      conText;
    const reportedMessages = {};
    const devlopernumber = "254746844168";
    try {
      if (!isSuperUser) return reply("*Owner Only Command*");
      if (!q)
        return reply(
          `Example: ${botPrefix}request hi dev downloader commands are not working`,
        );
      const messageId = mek.key.id;
      if (reportedMessages[messageId]) {
        return reply(
          "This report has already been forwarded to the owner. Please wait for a response.",
        );
      }
      reportedMessages[messageId] = true;
      const textt = `*| REQUEST/REPORT |*`;
      const teks1 = `\n\n*User*: @${sender.split("@")[0]}\n*Request:* ${q}`;
      MeshTech.sendMessage(
        devlopernumber + "@s.whatsapp.net",
        {
          text: textt + teks1,
          mentions: [sender],
        },
        {
          quoted: mek,
        },
      );
      reply(
        "Tʜᴀɴᴋ ʏᴏᴜ ꜰᴏʀ ʏᴏᴜʀ ʀᴇᴘᴏʀᴛ. Iᴛ ʜᴀs ʙᴇᴇɴ ꜰᴏʀᴡᴀʀᴅᴇᴅ ᴛᴏ ᴛʜᴇ ᴏᴡɴᴇʀ. Pʟᴇᴀsᴇ ᴡᴀɪᴛ ꜰᴏʀ ᴀ ʀᴇsᴘᴏɴsᴇ.",
      );
      await react("✅");
    } catch (e) {
      reply(e);
      console.log(e);
    }
  },
);

gmd(
  {
    pattern: "category",
    aliases: ["cat"],
    description: "Open a command category from the dropdown",
    react: "📂",
    category: "general",
  },
  async (from, MeshTech, conText) => {
    const { args, botPrefix, botFooter, react, reply } = conText;
    const categoryName = String(args?.[0] || "").toLowerCase();
    if (!categoryName) return reply(`Use ${botPrefix}menu and select a category.`);

    const categoryCommands = commands
      .filter((command) =>
        command.pattern &&
        !command.dontAddCommandList &&
        String(command.category || "general").toLowerCase() === categoryName
      )
      .sort((a, b) => String(a.pattern).localeCompare(String(b.pattern)));

    if (!categoryCommands.length) return reply(`No commands found for *${categoryName}*.`);

    const categoryMeta = menuCategoryMeta(categoryName);
    const categoryTitle = categoryMeta.label;
    const body = categoryCommands
      .map((command, index) => {
        const prefix = command.on === "body" ? "" : botPrefix;
        return `║${String(index + 1).padStart(2, "0")} ⟿ ୧⍤⃝${commandEmoji(command)} ${toBold(`${prefix}${command.pattern}`)} ୧⍤⃝${commandEmoji(command)}`;
      })
      .join("\n");

    await sendButtons(MeshTech, from, {
      title: `୧⍤⃝${categoryMeta.emoji} ${categoryTitle}`,
      text: `╔═❖•⊰ ୧⍤⃝${categoryMeta.emoji} *${toBold(categoryTitle)}* ⊱•❖═╗\n║୧⍤⃝${categoryMeta.emoji} Commands in this branch\n╚═══════════════════╝\n${readmore}\n${body}\n╚═══════════════════╝`,
      footer: `> *${botFooter}*`,
      buttons: [
        { id: `${botPrefix}menu`, text: "📂 All Categories" },
        { id: `${botPrefix}list`, text: "📜 Full List" },
      ],
    });
    await react("✅");
  },
);

const toggleHelpEntries = [
  { key: "setautoreact", title: "Auto React", usage: "setautoreact on|off|all|dm|groups", detail: "Controls automatic reactions to incoming messages." },
  { key: "setantidelete", title: "Anti Delete", usage: "setantidelete inchat|indm|all|off", detail: "Restores deleted messages in chat, forwards them to the owner inbox, or does both." },
  { key: "setantiedit", title: "Anti Edit", usage: "setantiedit on|off|indm|inchat", detail: "Shows edited-message information in the selected destination." },
  { key: "setchatbot", title: "Chatbot", usage: "setchatbot on|off|audio", detail: "Turns the chatbot response mode on, off, or audio." },
  { key: "setstartmsg", title: "Start Message", usage: "setstartmsg on|off", detail: "Controls the startup/status message." },
  { key: "setanticall", title: "Anti Call", usage: "setanticall on|off|block|decline", detail: "Controls incoming WhatsApp call handling." },
  { key: "setwelcome", title: "Welcome", usage: "setwelcome on|off", detail: "Enables or disables welcome messages in the current group." },
  { key: "setgoodbye", title: "Goodbye", usage: "setgoodbye on|off", detail: "Enables or disables goodbye messages in the current group." },
  { key: "setantilink", title: "Anti Link", usage: "setantilink on|warn|delete|kick|off", detail: "Controls link protection in the current group." },
  { key: "setantibad", title: "Anti Bad Words", usage: "setantibad on|warn|delete|kick|off", detail: "Controls bad-word protection in the current group." },
];

gmd(
  {
    pattern: "togglemenu",
    aliases: ["toggles", "togglehelp"],
    description: "Open toggle commands and usage details",
    react: "🎛️",
    category: "general",
  },
  async (from, MeshTech, conText) => {
    const { botPrefix, botFooter, react, mek } = conText;
    const rows = toggleHelpEntries.map((entry) => ({
      title: `🎛️ ${entry.title}`,
      description: entry.usage,
      rowId: `${botPrefix}toggleinfo ${entry.key}`,
    }));
    await MeshTech.sendMessage(from, {
      text: `╔═❖•⊰ *${toBold("TOGGLE COMMANDS")}* ⊱•❖═╗\n║ Select a feature to view its usage.\n╚═══════════════════╝`,
      title: "🎛️ TOGGLE HELP",
      footerText: `> *${botFooter}*`,
      buttonText: "📋 OPEN TOGGLE COMMANDS",
      sections: [{ title: "Feature switches", rows }],
      listType: 1,
    }, { quoted: mek });
    await react("✅");
  },
);

gmd(
  {
    pattern: "toggleinfo",
    aliases: ["toggleusage"],
    description: "Show usage for one toggle command",
    react: "📖",
    category: "general",
  },
  async (from, MeshTech, conText) => {
    const { args, botPrefix, botFooter, react, reply } = conText;
    const entry = toggleHelpEntries.find((item) => item.key === String(args?.[0] || "").toLowerCase());
    if (!entry) return reply(`Use ${botPrefix}togglemenu to select a toggle.`);
    await sendButtons(MeshTech, from, {
      title: `🎛️ ${entry.title}`,
      text: `╔═❖•⊰ *${toBold(entry.title.toUpperCase())}* ⊱•❖═╗\n\n${entry.detail}\n\n🛠️ *Usage:*\n${botPrefix}${entry.usage}\n╚═══════════════════╝`,
      footer: `> *${botFooter}*`,
      buttons: [
        { id: `${botPrefix}togglemenu`, text: "🎛️ All Toggles" },
        { id: `${botPrefix}menu`, text: "📂 Main Menu" },
      ],
    });
    await react("✅");
  },
);

gmd(
  {
    pattern: "list",
    aliases: ["listmenu", "listmen"],
    description: "Show All Commands and their Usage",
    react: "📜",
    category: "general",
  },
  async (from, MeshTech, conText) => {
    const {
      mek,
      sender,
      react,
      pushName,
      botPic,
      botMode,
      botVersion,
      botName,
      botFooter,
      timeZone,
      botPrefix,
      newsletterJid,
      reply,
    } = conText;
    try {
      function formatUptime(seconds) {
        const days = Math.floor(seconds / (24 * 60 * 60));
        seconds %= 24 * 60 * 60;
        const hours = Math.floor(seconds / (60 * 60));
        seconds %= 60 * 60;
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
      }

      const now = new Date();
      const date = new Intl.DateTimeFormat("en-GB", {
        timeZone: timeZone,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(now);

      const time = new Intl.DateTimeFormat("en-GB", {
        timeZone: timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(now);

      const uptime = formatUptime(process.uptime());
      const totalCommands = commands.filter(
        (command) => command.pattern && !command.dontAddCommandList,
      ).length;

		      let list = `╭━━━〔 ${toBold("MESH TECH MD V2.5")} 〕━━━┈⊷
┃ *𝑴𝒐𝒅𝒆:*  ${monospace(botMode)}
┃ *𝑷𝒓𝒆𝒇𝒊𝒙:*  [ ${monospace(botPrefix)} ]
┃ *𝑼𝒔𝒆𝒓:*  ${monospace(pushName)}
┃ *𝑷𝒍𝒖𝒈𝒊𝒏𝒔:*  ${monospace(totalCommands.toString())}
┃ *𝑽𝒆𝒓𝒔𝒊𝒐𝒏:*  ${monospace(botVersion)}
┃ *𝑼𝒑𝒕𝒊𝒎𝒆:*  ${monospace(uptime)}
┃ *𝑻𝒊𝒎𝒆:*  ${monospace(time)}
┃ *𝑫𝒂𝒕𝒆:*  ${monospace(date)}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷\n\n${readmore}\n`;

      const categorized = {};
      for (const category of MENU_CATEGORY_ORDER) {
        categorized[category] = [];
      }

      for (const command of commands) {
        if (!command.pattern || command.dontAddCommandList) continue;
        const category = menuCategoryKey(command.category);
        if (categorized[category]) {
          categorized[category].push(command);
        } else {
          categorized.utility.push(command);
        }
      }

      for (const category of MENU_CATEGORY_ORDER) {
        const meta = menuCategoryMeta(category);
        const categoryCommands = categorized[category].sort((a, b) => a.pattern.localeCompare(b.pattern));
        if (categoryCommands.length > 0) {
          list += `╔═❖•⊰ ୧⍤⃝${meta.emoji} ${toBold(meta.label)} ⊱•❖═╗\n`;
          categoryCommands.forEach((command, index) => {
            const prefix = command.on === "body" ? "" : botPrefix;
            list += `║${String(index + 1).padStart(2, "0")} ⟿ ୧⍤⃝${commandEmoji(command)} ${toBold(`${prefix}${command.pattern}`)} ୧⍤⃝${commandEmoji(command)}\n`;
          });
          list += `╚═══════════════════╝\n\n`;
        }
      }

      list += `> *${botFooter}*`;

      await MeshTech.sendMessage(
        from,
        {
          image: { url: botPic },
          caption: list,
          contextInfo: {
            mentionedJid: [sender],
            forwardingScore: 5,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: newsletterJid,
              newsletterName: botName,
              serverMessageId: 143,
            },
          },
        },
        { quoted: mek },
      );
      await react("✅");
    } catch (e) {
      console.error(e);
      reply(`${e}`);
    }
  },
);

gmd(
  {
    pattern: "menu",
    aliases: ["help", "h", "m"],
    description: "Show command categories and help menu",
    react: "📂",
    category: "general",
  },
  async (from, MeshTech, conText) => {
    const {
      mek,
      sender,
      react,
      pushName,
      botPic,
      botMode,
      botVersion,
      botName,
      botFooter,
      timeZone,
      botPrefix,
      ownerName,
      ownerNumber,
      reply,
    } = conText;
    try {
      function formatUptime(seconds) {
        const days = Math.floor(seconds / (24 * 60 * 60));
        seconds %= 24 * 60 * 60;
        const hours = Math.floor(seconds / (60 * 60));
        seconds %= 60 * 60;
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
      }

      const now = new Date();
      const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone }).format(now));
      const greeting = hour >= 5 && hour < 12 ? "🌅 Good Morning" : hour >= 12 && hour < 17 ? "☀️ Good Afternoon" : hour >= 17 && hour < 21 ? "🌆 Good Evening" : "🌙 Good Night";
      const date = new Intl.DateTimeFormat("en-GB", { timeZone, day: "2-digit", month: "2-digit", year: "numeric" }).format(now);
      const time = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }).format(now);
      const uptime = formatUptime(process.uptime());
      const totalCommands = commands.filter((command) => command.pattern && !command.dontAddCommandList).length;
      const activeUsers = getActiveUserCount();
      const connectedBots = MeshTech?.user?.id ? "1 Active" : "0 Inactive";
      const deviceName = process.env.DEVICE_NAME || "ANDROID-CORE";
      const liveRam = `${formatBytes(process.memoryUsage().rss)}/${formatBytes(totalMemoryBytes)}`;

      const categorized = {};
      for (const category of MENU_CATEGORY_ORDER) {
        categorized[category] = [];
      }

      for (const command of commands) {
        if (!command.pattern || command.dontAddCommandList) continue;
        const category = menuCategoryKey(command.category);
        if (categorized[category]) {
          categorized[category].push(command);
        } else {
          categorized.utility.push(command);
        }
      }

      for (const category of MENU_CATEGORY_ORDER) {
        categorized[category].sort((a, b) => a.pattern.localeCompare(b.pattern));
      }
      const sortedCategories = MENU_CATEGORY_ORDER.filter((category) => categorized[category].length > 0);

      const header = `╭━━━ *${toBold("𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛 𝗠𝗗 𝗕𝗢𝗧")} ━━━╮
┃ ${toBold(greeting)}
┃ 🔥 *${toBold("Mode:")}* ${monospace(String(botMode || "PUBLIC").toUpperCase())}|FULL POWER
┃ 💀 *${toBold("Protocol:")}* PHANTOM CORE
┃ 👑 *${toBold("Owner:")}* ${monospace(ownerName)}
┃ 📞 *${toBold("Number:")}* ${monospace(ownerNumber)}
┃ ⚙️ *${toBold("Version:")}* ${monospace(botVersion || "V2.5")}
┃ ⏳ *${toBold("Uptime:")}* ${monospace(uptime)}
┃ 📅 *${toBold("Date:")}* ${monospace(date)}
┃ 🕒 *${toBold("Time:")}* ${monospace(time)}
┃ 📌 *${toBold("Commands:")}* ${monospace(`${totalCommands} Loaded`)}
┃ 👥 *${toBold("Users:")}* ${monospace(`${activeUsers} Active (real-time)`)}` + `
┃ 🤖 *${toBold("Bots Connected:")}* ${monospace(connectedBots)}
┃ 📱 *${toBold("Device:")}* ${monospace(deviceName)}
┃ 🧠 *${toBold("RAM:")}* ${monospace(liveRam)}
╰━━━━━━━━━━━━━━━━━━╯`;

      const rows = sortedCategories.map((category) => {
        const meta = menuCategoryMeta(category);
        return {
          title: `୧⍤⃝${meta.emoji} ${toBold(meta.label)}`,
          description: `${categorized[category].length} command${categorized[category].length === 1 ? "" : "s"} available`,
          rowId: `${botPrefix}category ${category}`,
        };
      });

      const sections = [];
      for (let index = 0; index < rows.length; index += 10) {
        sections.push({
          title: `୧⍤⃝💐 ${toBold("MESH-TECH COMMAND CATEGORIES")}`,
          rows: rows.slice(index, index + 10),
        });
      }

      const categoryPreview = sortedCategories
        .map((category) => {
          const meta = menuCategoryMeta(category);
          return `║୧⍤⃝${meta.emoji} ${toBold(meta.label)}`;
        })
        .join("\n");

      let commandNumber = 0;
      const fullCommandList = sortedCategories.map((category) => {
        const meta = menuCategoryMeta(category);
        const rows = categorized[category].map((command) => {
          commandNumber += 1;
          const prefix = command.isBody ? "" : botPrefix;
          return `║${String(commandNumber).padStart(3, "0")} ⟿ ୧⍤⃝${meta.emoji} ${toBold(`${prefix}${command.pattern}`)} ୧⍤⃝${meta.emoji}`;
        }).join("\n");
        return `╔═❖•⊰ ୧⍤⃝${meta.emoji} ${toBold(meta.label)} ⊱•❖═╗\n${rows}\n╚═══════════════════╝`;
      }).join("\n\n");

      const menuMessage = {
        text: `${header}\n\n${readmore}\n\n╔═❖•⊰ *${toBold("𝗖𝗢𝗠𝗠𝗔𝗡𝗗 𝗠𝗘𝗡𝗨")}* ⊱•❖═╗\n║୧⍤⃝💐 ${toBold("All loaded commands")}\n╚═══════════════════╝\n${fullCommandList}\n\n${readmore}\n\n╔═❖•⊰ *${toBold("𝗖𝗢𝗠𝗠𝗔𝗡𝗗 𝗖𝗔𝗧𝗘𝗚𝗢𝗥𝗜𝗘𝗦")}* ⊱•❖═╗\n${categoryPreview}\n╚═══════════════════╝\n\n୧⍤⃝💐 Open the dropdown below to browse every command branch.`,
        title: "📂 COMMAND DROPDOWN",
        footerText: `> *${botFooter}*`,
        buttonText: "📜 OPEN COMMAND MENUS",
        sections,
        listType: 1,
      };

      const menuLogoUrl = botPic || "https://i.postimg.cc/vHZz7VWG/bot-logo.png";
      try {
        await sendButtons(MeshTech, from, {
          image: { url: menuLogoUrl },
          title: "📂 COMMAND DROPDOWN",
          text: `${header}\n\n${readmore}\n\n╔═❖•⊰ *${toBold("𝗖𝗢𝗠𝗠𝗔𝗡𝗗 𝗠𝗘𝗡𝗨")}* ⊱•❖═╗\n║୧⍤⃝💐 ${toBold("All loaded commands")}\n╚═══════════════════╝\n${fullCommandList}\n\n${readmore}\n\n╔═❖•⊰ *${toBold("𝗖𝗢𝗠𝗠𝗔𝗡𝗗 𝗖𝗔𝗧𝗘𝗚𝗢𝗥𝗜𝗘𝗦")}* ⊱•❖═╗\n${categoryPreview}\n╚═══════════════════╝\n\n୧⍤⃝💐 Open the dropdown below to browse every command branch.`,
          footer: `> *${botFooter}*`,
          buttons: [
            {
              name: 'single_select',
              buttonParamsJson: JSON.stringify({
                title: "📜 OPEN COMMAND MENUS",
                sections: sections.map(s => ({
                  ...s,
                  rows: s.rows.map(r => ({
                    ...r,
                    id: r.rowId // Map rowId to id for mesh-btns compatibility
                  }))
                }))
              })
            }
          ]
        }, { quoted: mek });
      } catch (error) {
        console.error("Menu interactive response failed:", error.message);
        // Fallback: Send a single image message with the full menu text as caption to avoid duplication
        await MeshTech.sendMessage(
          from,
          {
            image: { url: menuLogoUrl },
            caption: menuMessage.text,
          },
          { quoted: mek },
        );
      }
      await react("✅");
    } catch (e) {
      console.error(e);
      reply(`${e}`);
    }
  },
);

gmd(
  {
    pattern: "return",
    aliases: ["details", "det", "ret"],
    react: "⚡",
    category: "owner",
    description:
      "Displays the full raw quoted message using Baileys structure.",
  },
  async (from, MeshTech, conText) => {
    const {
      mek,
      reply,
      react,
      quotedMsg,
      isSuperUser,
      botName,
      botFooter,
      newsletterJid,
      newsletterUrl,
    } = conText;

    if (!isSuperUser) {
      return reply(`Owner Only Command!`);
    }

    if (!quotedMsg) {
      return reply(`Please reply to/quote a message`);
    }

    try {
      const jsonString = JSON.stringify(quotedMsg, null, 2);
      const chunks = jsonString.match(/[\s\S]{1,100000}/g) || [];

      for (const chunk of chunks) {
        const formattedMessage = `\`\`\`\n${chunk}\n\`\`\``;

        await sendButtons(MeshTech, from, {
          title: "",
          text: formattedMessage,
          footer: `> *${botFooter}*`,
          buttons: [
            {
              name: "cta_copy",
              buttonParamsJson: JSON.stringify({
                display_text: "Copy",
                copy_code: formattedMessage,
              }),
            },
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: "WaChannel",
                url: newsletterUrl,
              }),
            },
          ],
        });
        await react("✅");
      }
    } catch (error) {
      console.error("Error processing quoted message:", error);
      await reply(`❌ An error occurred while processing the message.`);
    }
  },
);

gmd(
  {
    pattern: "alive",
    aliases: ["status", "online"],
    react: "🌐",
    category: "general",
    description: "Show live bot status, uptime, activity, and resources.",
  },
  async (from, MeshTech, conText) => {
    const { mek, react, reply, botName, botMode, botVersion, ownerName, ownerNumber, timeZone, botPrefix } = conText;
    try {
      const now = new Date();
      const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone }).format(now));
      const greeting = hour >= 5 && hour < 12 ? "🌅 Good Morning" : hour >= 12 && hour < 17 ? "☀️ Good Afternoon" : hour >= 17 && hour < 21 ? "🌆 Good Evening" : "🌙 Good Night";
      const formattedDate = new Intl.DateTimeFormat("en-GB", { timeZone, day: "2-digit", month: "short", year: "numeric" }).format(now).toUpperCase();
      const formattedTime = new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }).format(now);
      const uptimeSeconds = Math.floor(process.uptime());
      const days = Math.floor(uptimeSeconds / 86400);
      const hours = Math.floor((uptimeSeconds % 86400) / 3600);
      const minutes = Math.floor((uptimeSeconds % 3600) / 60);
      const seconds = uptimeSeconds % 60;
      const totalCommands = commands.filter((command) => command.pattern && !command.dontAddCommandList).length;
      const activeUsers = getActiveUserCount();
      const connection = MeshTech?.user?.id ? "1 Live" : "0 Offline";
      const number = String(ownerNumber || MeshTech?.user?.id?.split(":")?.[0] || "254746844168").replace(/\D/g, "") || "254746844168";
      const memory = `${formatBytes(process.memoryUsage().rss)}/${formatBytes(totalMemoryBytes)}`;
      
      const text = `╭━━━━━━━━━━━━━━━❍
│ 🌟 *${botName || "MESH-TECH MD"}*
│━━━━━━━━━━━━━━━❍
│
│ 👋 *${greeting}*
│ 🤖 *Status:* System Online & Stable
│
│━━━━━━━━━━━━━━━❍
│ 👤 *Owner:* ${ownerName || "MESHACK N"}
│ 📞 *Number:* ${number}
│ ⚙️ *Version:* ${botVersion || "V2.5"}
│ 🔥 *Mode:* ${String(botMode || "PUBLIC").toUpperCase()} | FULL POWER
│ ⏳ *Uptime:* ${days}d ${hours}h ${minutes}m ${seconds}s
│ 📅 *Date:* ${formattedDate}
│ 🕒 *Time:* ${formattedTime}
│ 📌 *Commands:* ${totalCommands} Loaded
│ 👥 *Users:* ${activeUsers} Active
│ 🤖 *Bots:* ${connection}
│ 🧠 *RAM:* ${memory}
│━━━━━━━━━━━━━━━❍
│ 🚀 *Ready to serve you!*
╰━━━━━━━━━━━━━━━⬣`;

      await MeshTech.sendMessage(from, { text }, { quoted: mek });

      const audioPath = path.join(__dirname, "../assets/alive.m4a");
      if (fs.existsSync(audioPath)) {
        await MeshTech.sendMessage(
          from,
          {
            audio: fs.readFileSync(audioPath),
            mimetype: "audio/mp4",
            ptt: false,
          },
          { quoted: mek },
        );
      }

      await react("✅");
    } catch (error) {
      console.error("Error processing alive command:", error);
      await reply(`❌ Alive status failed: ${error.message}`);
    }
  },
);

gmd(
  {
    pattern: "uptime",
    aliases: ["up"],
    react: "⏳",
    category: "general",
    description: "check bot uptime status.",
  },
  async (from, MeshTech, conText) => {
    const {
      mek,
      react,
      newsletterJid,
      newsletterUrl,
      botFooter,
      botName,
      botPrefix,
    } = conText;

    const uptimeMs = Date.now() - BOT_START_TIME;

    const seconds = Math.floor((uptimeMs / 1000) % 60);
    const minutes = Math.floor((uptimeMs / (1000 * 60)) % 60);
    const hours = Math.floor((uptimeMs / (1000 * 60 * 60)) % 24);
    const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));

    await sendButtons(MeshTech, from, {
      title: "",
      text: `⏱️ Uptime: ${days}d ${hours}h ${minutes}m ${seconds}s`,
      footer: `> *${botFooter}*`,
      buttons: [
        { id: `${botPrefix}ping`, text: "⚡ Ping" },
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "WaChannel",
            url: newsletterUrl,
          }),
        },
      ],
    });
    await react("✅");
  },
);

gmd(
  {
    pattern: "repo",
    aliases: ["sc", "rep", "script"],
    react: "💜",
    category: "general",
    description: "Fetch bot script.",
  },
  async (from, MeshTech, conText) => {
    const {
      mek,
      sender,
      react,
      pushName,
      botPic,
      botName,
      botFooter,
      newsletterUrl,
      ownerName,
      newsletterJid,
      meshtechRepo,
    } = conText;

    const response = await axios.get(
      `https://api.github.com/repos/${meshtechRepo}`,
    );
    const repoData = response.data;
    const {
      full_name,
      name,
      forks_count,
      stargazers_count,
      created_at,
      updated_at,
      owner,
    } = repoData;
    const messageText = `Hello *_${pushName}_,*\nThis is *${botName},* A Whatsapp Bot Built by *${ownerName},* Enhanced with Amazing Features to Make Your Whatsapp Communication and Interaction Experience Amazing\n\n*❲❒❳ ɴᴀᴍᴇ:* ${name}\n*❲❒❳ sᴛᴀʀs:* ${stargazers_count}\n*❲❒❳ ғᴏʀᴋs:* ${forks_count}\n*❲❒❳ ᴄʀᴇᴀᴛᴇᴅ ᴏɴ:* ${new Date(created_at).toLocaleDateString()}\n*❲❒❳ ʟᴀsᴛ ᴜᴘᴅᴀᴛᴇᴅ:* ${new Date(updated_at).toLocaleDateString()}`;

    const dateNow = Date.now();
    await sendButtons(MeshTech, from, {
      title: "",
      text: messageText,
      footer: `> *${botFooter}*`,
      image: { url: botPic },
      buttons: [
        {
          name: "cta_copy",
          buttonParamsJson: JSON.stringify({
            display_text: "Copy Link",
            copy_code: `https://github.com/${meshtechRepo}`,
          }),
        },
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "Visit Repo",
            url: `https://github.com/${meshtechRepo}`,
          }),
        },
        {
          id: `repo_dl_${dateNow}`,
          text: "📥 Download Zip",
        },
      ],
    });

    const handleResponse = async (event) => {
      const messageData = event.messages[0];
      if (!messageData?.message) return;

      const templateButtonReply =
        messageData.message?.templateButtonReplyMessage;
      if (!templateButtonReply) return;

      const selectedButtonId = templateButtonReply.selectedId;
      if (!selectedButtonId?.includes(`repo_dl_${dateNow}`)) return;

      const isFromSameChat = messageData.key?.remoteJid === from;
      if (!isFromSameChat) return;

      try {
        const zipUrl = `https://github.com/${meshtechRepo}/archive/refs/heads/main.zip`;
        await MeshTech.sendMessage(from, { document: { url: zipUrl }, fileName: `${name}.zip`, mimetype: "application/zip" }, { quoted: messageData });
      } catch (e) {
        console.error("Repo download error:", e);
      }
    };

    MeshTech.ev.on("messages.upsert", handleResponse);
    setTimeout(() => MeshTech.ev.off("messages.upsert", handleResponse), 300000);
    await react("✅");
  },
);
