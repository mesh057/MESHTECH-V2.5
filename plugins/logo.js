const { gmd, gmdBuffer } = require("../meshtech");
const axios = require("axios");

// Mapping of legacy endpoint names to real Ephoto360 URLs
const ephotoMapping = {
  glossysilver: "https://en.ephoto360.com/glossy-silver-text-effect-online-802.html",
  angelWing: "https://en.ephoto360.com/create-angel-wing-text-effect-online-free-633.html",
  facebookTypo: "https://en.ephoto360.com/facebook-typography-text-effect-online-632.html",
  hollywoodStar: "https://en.ephoto360.com/hollywood-star-text-effect-online-631.html",
  blueNeonLogo: "https://en.ephoto360.com/blue-neon-text-effect-online-630.html",
  fireworks: "https://en.ephoto360.com/fireworks-text-effect-online-629.html",
  fpsGamingLogo: "https://en.ephoto360.com/fps-gaming-logo-text-effect-online-628.html",
  assassinLogo: "https://en.ephoto360.com/assassin-logo-text-effect-online-627.html",
  footballLogo: "https://en.ephoto360.com/football-logo-text-effect-online-626.html",
  neonDevilWings: "https://en.ephoto360.com/neon-devil-wings-text-effect-online-625.html",
  mascotShield: "https://en.ephoto360.com/mascot-shield-logo-text-effect-online-624.html",
  writetext: "https://en.ephoto360.com/write-text-effect-online-802.html",
  blackpinklogo: "https://en.ephoto360.com/create-blackpink-logo-online-free-617.html",
  glitchtext: "https://en.ephoto360.com/create-glitch-text-effect-style-tik-tok-online-free-616.html",
  advancedglow: "https://en.ephoto360.com/advanced-glow-text-effect-810.html",
  typographytext: "https://en.ephoto360.com/create-typography-text-effect-on-pc-632.html",
  pixelglitch: "https://en.ephoto360.com/create-pixel-glitch-text-effect-online-free-592.html",
  neonglitch: "https://en.ephoto360.com/create-neon-glitch-text-effect-online-free-591.html",
  nigerianflag: "https://en.ephoto360.com/nigeria-flag-text-effect-online-free-586.html",
  americanflag: "https://en.ephoto360.com/usa-flag-text-effect-online-free-585.html",
  deletingtext: "https://en.ephoto360.com/create-deleting-text-effect-online-free-584.html",
  blackpinkstyle: "https://en.ephoto360.com/blackpink-text-effect-online-free-583.html",
  glowingtext: "https://en.ephoto360.com/create-glowing-text-effect-online-free-582.html",
  underwater: "https://en.ephoto360.com/create-underwater-text-effect-online-free-581.html",
  logomaker: "https://en.ephoto360.com/create-blackpink-logo-online-free-617.html",
  cartoonstyle: "https://en.ephoto360.com/create-cartoon-style-text-effect-online-578.html",
  papercut: "https://en.ephoto360.com/create-paper-cut-text-effect-online-577.html",
  effectclouds: "https://en.ephoto360.com/create-effect-clouds-text-effect-online-576.html",
  gradienttext: "https://en.ephoto360.com/create-gradient-text-effect-online-575.html",
  summerbeach: "https://en.ephoto360.com/create-summer-beach-text-effect-online-574.html",
  sandsummer: "https://en.ephoto360.com/create-sand-summer-beach-text-effect-online-573.html",
  luxurygold: "https://en.ephoto360.com/create-luxury-gold-text-effect-online-572.html",
  galaxy: "https://en.ephoto360.com/create-galaxy-text-effect-online-571.html",
  "1917": "https://en.ephoto360.com/create-1917-text-effect-online-570.html",
  makingneon: "https://en.ephoto360.com/create-making-neon-text-effect-online-569.html",
  texteffect: "https://en.ephoto360.com/create-text-effect-online-568.html",
  galaxystyle: "https://en.ephoto360.com/create-galaxy-style-text-effect-online-567.html",
  lighteffect: "https://en.ephoto360.com/create-light-effect-online-566.html",
};

const logoEndpoints = [
  {
    pattern: "glossysilver",
    aliases: ["glossy", "silverlogo"],
    description: "Glossy Silver logo",
    endpoint: "glossysilver",
  },
  {
    pattern: "angelWing",
    aliases: ["angelWing", "meshtech6"],
    description: "angelWing Silver logo",
    endpoint: "angelWing",
  },
  {
    pattern: "facebookTypo",
    aliases: ["facebookTypo", "meshtech5"],
    description: "facebookTypo Silver logo",
    endpoint: "facebookTypo",
  },
  {
    pattern: "hollywoodStar",
    aliases: ["hollywoodStar", "meshtech4"],
    description: "hollywoodStar Silver logo",
    endpoint: "hollywoodStar",
  },
  {
    pattern: "blueNeonLogo",
    aliases: ["blueNeonLogo", "blueneon"],
    description: "blueNeonLogo Silver logo",
    endpoint: "blueNeonLogo",
  },
  {
    pattern: "fireworks",
    aliases: ["fireworks", "meshtech3"],
    description: "fireworks Silver logo",
    endpoint: "fireworks",
  },
  {
    pattern: "fpsGamingLogo",
    aliases: ["fpsGamingLogo", "meshtech2"],
    description: "fpsGamingLogo Silver logo",
    endpoint: "fpsGamingLogo",
  },
  {
    pattern: "assassinLogo",
    aliases: ["assassinLogo", "meshtech1"],
    description: "assassinLogo Style logo",
    endpoint: "assassinLogo",
  },
  {
    pattern: "footballLogo",
    aliases: ["footballLogo", "ball"],
    description: "footballLogo Style logo",
    endpoint: "footballLogo",
  },
  {
    pattern: "neonDevilWings",
    aliases: ["neonDevilWings", "neon"],
    description: "neonDevilWings Style logo",
    endpoint: "neonDevilWings",
  },
  {
    pattern: "mascotShield",
    aliases: ["mascotShield", "mascot"],
    description: "mascotShield Style logo",
    endpoint: "mascotShield",
  },
  {
    pattern: "writetext",
    aliases: ["textwrite", "baby", "writtentext"],
    description: "Write Text logo",
    endpoint: "writetext",
  },
  {
    pattern: "blackpinklogo",
    aliases: ["bplogo", "pinkblack"],
    description: "Black Pink Logo",
    endpoint: "blackpinklogo",
  },
  {
    pattern: "glitchtext",
    aliases: ["glitch", "textglitch"],
    description: "Glitch Text logo",
    endpoint: "glitchtext",
  },
  {
    pattern: "advancedglow",
    aliases: ["advglow", "glowadvanced"],
    description: "Advanced Glow logo",
    endpoint: "advancedglow",
  },
  {
    pattern: "typographytext",
    aliases: ["typography", "typo"],
    description: "Typography Text logo",
    endpoint: "typographytext",
  },
  {
    pattern: "pixelglitch",
    aliases: ["pixelg", "glitchpixel"],
    description: "Pixel Glitch logo",
    endpoint: "pixelglitch",
  },
  {
    pattern: "neonglitch",
    aliases: ["neong", "glitchneon"],
    description: "Neon Glitch logo",
    endpoint: "neonglitch",
  },
  {
    pattern: "nigerianflag",
    aliases: ["ngflag", "nigeria"],
    description: "Nigerian Flag logo",
    endpoint: "nigerianflag",
  },
  {
    pattern: "americanflag",
    aliases: ["usflag", "usaflag", "america"],
    description: "American Flag logo",
    endpoint: "americanflag",
  },
  {
    pattern: "deletingtext",
    aliases: ["deltext", "textdelete"],
    description: "Deleting Text logo",
    endpoint: "deletingtext",
  },
  {
    pattern: "blackpinkstyle",
    aliases: ["bpstyle", "pinkblackstyle"],
    description: "Blackpink Style logo",
    endpoint: "blackpinkstyle",
  },
  {
    pattern: "glowingtext",
    aliases: ["glowtxt", "textglow"],
    description: "Glowing Text logo",
    endpoint: "glowingtext",
  },
  {
    pattern: "underwater",
    aliases: ["underw", "waterlogo"],
    description: "Under Water logo",
    endpoint: "underwater",
  },
  {
    pattern: "logomaker",
    aliases: ["makelogo", "logomake"],
    description: "Logo Maker",
    endpoint: "logomaker",
  },
  {
    pattern: "cartoonstyle",
    aliases: ["cartoon", "toonlogo"],
    description: "Cartoon Style logo",
    endpoint: "cartoonstyle",
  },
  {
    pattern: "papercut",
    aliases: ["cutpaper", "papercutlogo"],
    description: "Paper Cut logo",
    endpoint: "papercut",
  },
  {
    pattern: "effectclouds",
    aliases: ["cloudeffect", "clouds"],
    description: "Effect Clouds logo",
    endpoint: "effectclouds",
  },
  {
    pattern: "gradienttext",
    aliases: ["gradient", "textgradient"],
    description: "Gradient Text logo",
    endpoint: "gradienttext",
  },
  {
    pattern: "summerbeach",
    aliases: ["beachsummer", "beach"],
    description: "Summer Beach logo",
    endpoint: "summerbeach",
  },
  {
    pattern: "sandsummer",
    aliases: ["summersand", "sand", "sandlogo"],
    description: "Sand Summer logo",
    endpoint: "sandsummer",
  },
  {
    pattern: "luxurygold",
    aliases: ["goldluxury", "luxgold"],
    description: "Luxury Gold logo",
    endpoint: "luxurygold",
  },
  {
    pattern: "galaxy",
    aliases: ["galaxylogo", "space"],
    description: "Galaxy logo",
    endpoint: "galaxy",
  },
  {
    pattern: "logo1917",
    aliases: ["1917", "1917logo"],
    description: "1917 Style logo",
    endpoint: "1917",
  },
  {
    pattern: "makingneon",
    aliases: ["neonmake", "neonlogo"],
    description: "Making Neon logo",
    endpoint: "makingneon",
  },
  {
    pattern: "texteffect",
    aliases: ["effecttext", "fxtext"],
    description: "Text Effect logo",
    endpoint: "texteffect",
  },
  {
    pattern: "galaxystyle",
    aliases: ["stylegalaxy", "galstyle"],
    description: "Galaxy Style logo",
    endpoint: "galaxystyle",
  },
  {
    pattern: "lighteffect",
    aliases: ["effectlight", "lightlogo"],
    description: "Light Effect logo",
    endpoint: "lighteffect",
  },
];

async function createLogoCommand(config) {
  gmd(
    {
      pattern: config.pattern,
      aliases: config.aliases,
      category: "logo",
      react: "🎨",
      description: `Create ${config.description}`,
    },
    async (from, MeshTech, conText) => {
      const {
        q,
        mek,
        reply,
        react,
        MeshTechApi,
        pushname,
        botCaption,
      } = conText;

      if (!q) {
        await react("❌");
        return reply(
          `Please provide text for the logo.\n\nUsage: .${config.pattern} <text>\nExample: .${config.pattern} ${pushname || "Mesh Tech"}`,
        );
      }

      const ephotoUrl = ephotoMapping[config.endpoint];
      if (!ephotoUrl) {
        await react("❌");
        return reply("This logo effect is currently unavailable.");
      }

      try {
        await react("⏳");

        const apiBase = MeshTechApi || "https://api.siputzx.my.id";
        const apiUrl = `${apiBase}/api/m/ephoto360?url=${encodeURIComponent(ephotoUrl)}&text1=${encodeURIComponent(q)}`;
        
        const res = await axios.get(apiUrl, { 
          responseType: 'arraybuffer',
          timeout: 60000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
          }
        });

        if (!res.data || res.data.length < 100) {
          await react("❌");
          return reply("Failed to generate logo. The API returned an invalid response.");
        }

        const imageBuffer = Buffer.from(res.data, 'binary');

        await MeshTech.sendMessage(
          from,
          {
            image: imageBuffer,
            caption: `✨ *${config.description}*\n\n📝 *Text:* ${q}\n\n> ${botCaption}`,
          },
          { quoted: mek },
        );

        await react("✅");
      } catch (e) {
        console.error(`Error in ${config.pattern} command:`, e.message);
        await react("❌");
        await reply("Failed to generate logo. Please try again later.");
      }
    },
  );
}

logoEndpoints.forEach((config) => createLogoCommand(config));

gmd(
  {
    pattern: "logolist",
    aliases: ["logos", "logo", "logohelp", "logomenu"],
    category: "logo",
    react: "📜",
    description: "Show all available logo commands",
  },
  async (from, MeshTech, conText) => {
    const { mek, reply, react, botCaption, botName, botPrefix } = conText;

    const logoList = logoEndpoints
      .map((l, i) => `${i + 1}. *.${l.pattern}* - ${l.description}`)
      .join("\n");

    await reply(
      `🎨 *${botName} LOGO MAKER*\n\n${logoList}\n\n📝 *Usage:* ${botPrefix}commandname <your text>\n📌 *Example:* ${botPrefix}glossysilver Mesh Tech\n\n> ${botCaption}`,
    );
    await react("✅");
  },
);
