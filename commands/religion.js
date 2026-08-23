const { gmd } = require("../meshtech");
const axios = require("axios");
const { sendButtons } = require("mesh-btns");

gmd(
  {
    pattern: "bible",
    aliases: ["verse", "bibleverse", "scripture"],
    react: "📖",
    category: "religion",
    description: "Get Bible verses",
  },
  async (from, MeshTech, conText) => {
    const { reply, react, q, botFooter, botName, MeshTechApi, MeshTechApiKey } =
      conText;

    const verse = q?.trim();
    if (!verse) {
      await react("❌");
      return reply(
        "Please provide a Bible verse reference\n\nUsage:\n.bible John 3:16\n.bible John 3:16-20\n.bible John 3",
      );
    }

    await react("⏳");

    try {
      let r;

      // Keep the configured MeshTech endpoint as the primary provider, but use
      // a public no-key fallback when that endpoint is unavailable or returns
      // 404. This prevents a provider outage from breaking .bible entirely.
      try {
        const res = await axios.get(`${MeshTechApi}/api/s/bible`, {
          params: { query: verse },
          timeout: 15000,
        });
        if (res.data?.success && res.data?.result) {
          r = res.data.result;
        }
      } catch (primaryError) {
        console.warn(`Primary Bible API unavailable (${primaryError.response?.status || primaryError.message}); using fallback.`);
      }

      if (!r) {
        const fallback = await axios.get(
          `https://bible-api.com/${encodeURIComponent(verse)}`,
          { timeout: 15000 },
        );
        const data = fallback.data;
        if (!data?.text) throw new Error("Bible verse was not found.");
        r = {
          verse: data.reference || verse,
          versesCount: Array.isArray(data.verses) ? data.verses.length : 1,
          data: data.text.trim(),
        };
      } 

      if (!r?.data) {
        await react("❌");
        return reply(
          "Failed to fetch Bible verse. Please check the reference format.",
        );
      } 

      

      let txt = `*${botName} BIBLE*\n\n`;
      txt += `📖 *Verse:* ${r.verse || verse}\n`;
      txt += `📊 *Verse Count:* ${r.versesCount || 1}\n\n`;
      txt += `*English:*\n${r.data?.trim() || "N/A"}\n\n`;

      if (r.translations) {
        if (r.translations.swahili) {
          txt += `*Swahili:*\n${r.translations.swahili}\n\n`;
        }
        if (r.translations.hindi) {
          txt += `*Hindi:*\n${r.translations.hindi}\n\n`;
        }
      }

      const copyContent = r.data?.trim() || "";

      await sendButtons(MeshTech, from, {
        title: "",
        text: txt,
        footer: botFooter,
        buttons: [
          {
            name: "cta_copy",
            buttonParamsJson: JSON.stringify({
              display_text: "📋 Copy Verse",
              copy_code: copyContent,
            }),
          },
        ],
      });

      await react("✅");
    } catch (e) {
      console.error("Bible verse error:", e);
      await react("❌");
      return reply("Failed to fetch Bible verse: " + e.message);
    }
  },
);

module.exports = {};
