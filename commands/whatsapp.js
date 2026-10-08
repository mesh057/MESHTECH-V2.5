const { gmd } = require("../meshtech");
const {
    getLidMapping,
    getGroupMetadata,
    updateGroupCache,
} = require("../meshtech/connection/groupCache");
const { getJidFromParticipant } = require("../meshtech/connection/groupEvents");

function getUserName(jid) {
    return jid.split("@")[0];
}

function normalizeUserJid(jid) {
    if (!jid || typeof jid !== "string") return "";

    if (jid.endsWith("@lid")) {
        const mapped = getLidMapping(jid);
        if (mapped) return mapped;
    }

    let normalized = jid.split(":")[0].split("/")[0];
    if (!normalized.includes("@")) {
        normalized += "@s.whatsapp.net";
    }

    if (normalized.endsWith("@lid")) {
        const mapped = getLidMapping(normalized);
        if (mapped) return mapped;
    }

    return normalized;
}

gmd(
    {
        pattern: "onwa",
        aliases: ["onwhatsapp", "checkwa", "checknumber"],
        react: "🔍",
        category: "utility",
        description: "Check if a phone number is registered on WhatsApp",
    },
    async (from, MeshTech, conText) => {
        const { sender, mek, reply, react, q, botPrefix } = conText;

        if (!q || q.trim() === "") {
            await react("❌");
            return reply(`❌ Please provide a phone number.

*Usage:* ${botPrefix}onwa <number>
*Example:* ${botPrefix}onwa 254704902701

_Include country code without + or spaces_`);
        }

        const num = q.trim().replace(/[^0-9]/g, "");

        if (num.length < 7 || num.length > 15) {
            await react("❌");
            return reply(`❌ Invalid phone number format.

Please provide a valid number with country code.
*Example:* .onwa 254704902701`);
        }

        await react("⏳");

        try {
            const [result] = await MeshTech.onWhatsApp(num);

            if (result && result.exists) {
                await react("✅");
                return reply(`✅ *Number Found on WhatsApp*

📞 *Number:* ${num}
🆔 *JID:* ${result.jid}

_This number is registered on WhatsApp._`);
            } else {
                await react("❌");
                return reply(`❌ *Not on WhatsApp*

📞 *Number:* ${num}

_This number is not registered on WhatsApp._`);
            }
        } catch (err) {
            await react("⚠️");
            return reply(`⚠️ Could not verify if ${num} is on WhatsApp.

Error: ${err.message}

_Please try again later._`);
        }
    },
);

gmd(
    {
        pattern: "vcf",
        aliases: ["contacts", "savecontact", "scontact", "savecontacts"],
        react: "📇",
        category: "group",
        description: "Export all group participants as VCF contact file",
        isGroup: true,
    },
    async (from, MeshTech, conText) => {
        const { sender, mek, reply, react } = conText;

        await react("⏳");

        try {
            let groupMetadata = await getGroupMetadata(MeshTech, from);
            // Do not export from a possibly stale five-minute cache. WhatsApp
            // can update the participant list without emitting a cache event.
            try {
                const freshMetadata = await MeshTech.groupMetadata(from);
                if (freshMetadata?.participants?.length) {
                    groupMetadata = freshMetadata;
                    updateGroupCache(from, freshMetadata);
                }
            } catch (metadataError) {
                console.warn("[vcf] Fresh group metadata unavailable; using cache:", metadataError.message);
            }
            const participants = groupMetadata?.participants || [];
            const groupName = groupMetadata?.subject || "Group";

            if (participants.length === 0) {
                await react("❌");
                return reply("❌ No participants found in this group.");
            }

            let vcfContent = "";
            let index = 1;
            const exportedNumbers = new Set();

            for (const member of participants) {
                // WhatsApp may expose the same member as a LID, PN, or JID.
                // Prefer phone-number fields, then resolve every available
                // identifier against the current group metadata.
                const candidates = [
                    member.pn,
                    member.phoneNumber,
                    member.participantPn,
                    member.userJid,
                    member.phone,
                    member.jid,
                    member.lid,
                    member.participant,
                    member.id,
                ].filter((value, position, values) =>
                    typeof value === "string" && value && values.indexOf(value) === position,
                );

                let phoneJid = "";
                for (const candidate of candidates) {
                    const resolved = await getJidFromParticipant(
                        MeshTech,
                        candidate,
                        groupMetadata,
                    );
                    const normalized = normalizeUserJid(resolved);
                    if (normalized.endsWith("@s.whatsapp.net")) {
                        phoneJid = normalized;
                        break;
                    }
                }

                if (!phoneJid || !phoneJid.includes("@s.whatsapp.net"))
                    continue;

                const id = phoneJid.split("@")[0];
                if (!/^\d+$/.test(id) || exportedNumbers.has(id)) continue;
                exportedNumbers.add(id);
                vcfContent += `BEGIN:VCARD\nVERSION:3.0\nFN:MESH-TECH MD CONTACT ${index++}\nTEL;type=CELL;type=VOICE;waid=${id}:+${id}\nEND:VCARD\n`;
            }

            const count = index - 1;

            if (count === 0) {
                await react("❌");
                return reply(
                    "❌ Could not extract any valid contacts from this group.",
                );
            }

            const fileName = `${groupName}.vcf`;

            await MeshTech.sendMessage(
                from,
                {
                    document: Buffer.from(vcfContent.trim(), "utf-8"),
                    mimetype: "text/vcard",
                    fileName: fileName,
                    caption: `Done saving.\nGroup Name: *${groupName}*\nContacts: *${count}*`,
                },
                { quoted: mek },
            );

            await react("✅");
        } catch (err) {
            await react("❌");
            return reply(`❌ Failed to export contacts: ${err.message}`);
        }
    },
);
