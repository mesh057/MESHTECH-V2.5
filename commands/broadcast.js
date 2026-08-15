const { getRecipients } = require("../meshtech/broadcastRegistry");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function extractQuotedText(quotedMsg) {
  if (!quotedMsg) return "";
  return (
    quotedMsg.conversation ||
    quotedMsg.extendedTextMessage?.text ||
    quotedMsg.imageMessage?.caption ||
    quotedMsg.videoMessage?.caption ||
    quotedMsg.documentMessage?.caption ||
    ""
  );
}

gmd(
  {
    pattern: "broadcast",
    aliases: ["bc", "announce"],
    react: "📢",
    category: "owner",
    description: "Broadcast an announcement to connected chats (owner only)",
  },
  async (from, Gifted, conText) => {
    const { q, quotedMsg, reply, react, isSuperUser, botName, botFooter } = conText;

    if (!isSuperUser) return reply("❌ *Owner Only Command!*");

    const announcement = String(q || extractQuotedText(quotedMsg) || "").trim();
    if (!announcement) {
      return reply(
        "Usage: .broadcast <message>\n\nYou can also reply to a message and send .broadcast."
      );
    }

    await react("⏳");

    const recipients = new Set(getRecipients());
    try {
      if (typeof Gifted.groupFetchAllParticipating === "function") {
        const groups = await Gifted.groupFetchAllParticipating();
        for (const jid of Object.keys(groups || {})) recipients.add(jid);
      }
    } catch (error) {
      console.error("Could not load participating groups for broadcast:", error.message);
    }

    const botJid = Gifted.user?.id?.split(":")[0];
    if (botJid) recipients.delete(`${botJid}@s.whatsapp.net`);
    recipients.delete(from);
    recipients.delete("status@broadcast");

    if (!recipients.size) {
      await react("❌");
      return reply("❌ No connected chats are available for broadcasting yet.");
    }

    const text = `📢 *${botName || "MESHTECH MD"} ANNOUNCEMENT*\n\n${announcement}\n\n> *${botFooter || "Powered by MESHTECH MD"}*`;
    let sent = 0;
    let failed = 0;

    for (const jid of recipients) {
      try {
        await Gifted.sendMessage(jid, { text });
        sent += 1;
      } catch (error) {
        failed += 1;
        console.error(`Broadcast failed for ${jid}:`, error.message);
      }
      await sleep(350);
    }

    await react(failed ? "⚠️" : "✅");
    return reply(
      `📢 *Broadcast complete*\n\n✅ Delivered: ${sent}\n❌ Failed: ${failed}\n📨 Total targets: ${recipients.size}`
    );
  }
);
