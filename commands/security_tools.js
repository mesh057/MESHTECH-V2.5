/**
 * MESH-TECH MD (v2.5) - Security & Ethical Hacking Toolbox
 * Inspired by Silent Wolf toolkit
 */

const axios = require('axios');

module.exports = {
  name: "security",
  commands: ["ipinfo", "whois", "dnslookup", "urlscan"],
  category: "Security",
  description: "Advanced cybersecurity and reconnaissance tools powered by MESH-TECH MD.",

  async execute(m, { client, text, command, reply }) {
    if (!text) {
      return reply(`Please provide a query/target for .${command}\nExample: .${command} google.com`);
    }

    await client.sendMessage(m.chat, { react: { text: "🔍", key: m.key } });

    try {
      if (command === "ipinfo") {
        const res = await axios.get(`http://ip-api.com/json/${text}`);
        const data = res.data;
        if (data.status === "fail") return reply("Failed to lookup IP information.");

        const info = `*🛡️ MESH-TECH MD | IP Reconnaissance*\n\n` +
                     `> *IP:* ${data.query}\n` +
                     `> *Country:* ${data.country} (${data.countryCode})\n` +
                     `> *Region:* ${data.regionName}\n` +
                     `> *City:* ${data.city}\n` +
                     `> *ISP:* ${data.isp}\n` +
                     `> *Org:* ${data.org}\n` +
                     `> *Timezone:* ${data.timezone}\n\n` +
                     `*_Powered by M-Tech Cyber Security_*`;
        
        await reply(info);
      } else if (command === "whois" || command === "dnslookup") {
        // Using public api for DNS / Domain lookup
        const res = await axios.get(`https://api.hackertarget.com/whois/?q=${text}`);
        const resultText = res.data.slice(0, 1500); // limit length
        
        await reply(`*🛡️ MESH-TECH MD | WHOIS / DNS Lookup*\n\n\`\`\`${resultText}\`\`\`\n\n*_Powered by M-Tech Cyber Security_*`);
      }

      await client.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
    } catch (error) {
      console.error("Security tool error:", error);
      reply(`Reconnaissance failed: ${error.message}`);
      await client.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
    }
  }
};
