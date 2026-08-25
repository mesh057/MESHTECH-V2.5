/**
 * MESH-TECH MD (v2.5) - Advanced Media Downloader Plugin
 * Powered by ruhend-scraper (Silent Wolf style)
 */

const { ytmp3, ytmp4, tiktok, instagram, facebook } = require('ruhend-scraper');

module.exports = {
  name: "downloader",
  commands: ["tiktok", "tt", "instagram", "ig", "facebook", "fb", "ytmp3", "ytmp4"],
  category: "Download",
  description: "Download media from TikTok, Instagram, Facebook, and YouTube with MESH-TECH MD branding.",
  
  async execute(m, { client, text, command, reply }) {
    if (!text) {
      return reply(`Please provide a valid URL to download.\nExample: .${command} https://...`);
    }

    await client.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });

    try {
      if (command === "tiktok" || command === "tt") {
        const res = await tiktok(text);
        if (!res || !res.video) return reply("Failed to fetch TikTok media. Please check the URL.");
        
        await client.sendMessage(m.chat, {
          video: { url: res.video },
          caption: `*✨ MESH-TECH MD | TikTok Downloader*\n\n> *Title:* ${res.title || 'Downloaded Video'}\n> *Author:* ${res.author || 'Unknown'}\n\n*_Powered by M-Tech AI_*`,
          contextInfo: { mentionedJid: [m.sender] }
        }, { quoted: m });
        
      } else if (command === "instagram" || command === "ig") {
        const res = await instagram(text);
        if (!res || res.length === 0) return reply("Failed to fetch Instagram media.");
        
        for (let media of res) {
          await client.sendMessage(m.chat, {
            [media.type === 'video' ? 'video' : 'image']: { url: media.url },
            caption: `*✨ MESH-TECH MD | Instagram Downloader*\n\n*_Powered by M-Tech AI_*`,
          }, { quoted: m });
        }
        
      } else if (command === "facebook" || command === "fb") {
        const res = await facebook(text);
        if (!res || !res.video) return reply("Failed to fetch Facebook video.");
        
        await client.sendMessage(m.chat, {
          video: { url: res.video.sd || res.video.hd },
          caption: `*✨ MESH-TECH MD | Facebook Downloader*\n\n> *Title:* ${res.title || 'Video'}\n\n*_Powered by M-Tech AI_*`,
        }, { quoted: m });
        
      } else if (command === "ytmp3") {
        const res = await ytmp3(text);
        if (!res || !res.audio) return reply("Failed to fetch YouTube audio.");
        
        await client.sendMessage(m.chat, {
          audio: { url: res.audio },
          mimetype: 'audio/mp4',
          ptt: false,
          fileName: `${res.title || 'audio'}.mp3`,
          caption: `*✨ MESH-TECH MD | YouTube Audio*\n\n> *Title:* ${res.title}\n\n*_Powered by M-Tech AI_*`
        }, { quoted: m });
        
      } else if (command === "ytmp4") {
        const res = await ytmp4(text);
        if (!res || !res.video) return reply("Failed to fetch YouTube video.");
        
        await client.sendMessage(m.chat, {
          video: { url: res.video },
          caption: `*✨ MESH-TECH MD | YouTube Video*\n\n> *Title:* ${res.title}\n\n*_Powered by M-Tech AI_*`
        }, { quoted: m });
      }

      await client.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
    } catch (error) {
      console.error("Downloader error:", error);
      reply(`Download failed: ${error.message}`);
      await client.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
    }
  }
};
