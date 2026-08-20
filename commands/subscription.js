const { gmd, getUserSubscription, upgradeUser, config, getSetting } = require("../meshtech");

const PLANS = {
    "1": { name: "Weekly Pro", price: 200, days: 7, description: "Full access to all AI & Research tools for 7 days." },
    "2": { name: "Monthly Pro", price: 600, days: 30, description: "Full access to all AI & Research tools for 30 days." },
    "3": { name: "Lifetime Pro", price: 2500, days: 36500, description: "Unlimited access to all features forever." }
};

gmd({
    pattern: "plans",
    desc: "View MESH-TECH MD Premium plans",
    category: "subscription",
    filename: __filename
}, async (MeshTech, chat, data) => {
    let msg = `*💎 MESH-TECH MD PREMIUM PLANS*\n\n`;
    for (const [id, plan] of Object.entries(PLANS)) {
        msg += `*${id}. ${plan.name}*\n`;
        msg += `> 💰 Price: KES ${plan.price}\n`;
        msg += `> ⏳ Duration: ${plan.days > 365 ? "Lifetime" : plan.days + " Days"}\n`;
        msg += `> ✨ ${plan.description}\n\n`;
    }
    msg += `_To buy a plan, use: *${data.prefix}buy <plan_number>*_\n`;
    msg += `_Example: *${data.prefix}buy 2*_`;
    
    return await MeshTech.sendMessage(chat.chat, { text: msg }, { quoted: chat });
});

gmd({
    pattern: "buy",
    desc: "Purchase a Premium subscription",
    category: "subscription",
    filename: __filename
}, async (MeshTech, chat, data) => {
    const planId = data.args[0];
    if (!planId || !PLANS[planId]) {
        return await MeshTech.sendMessage(chat.chat, { text: `*❌ Invalid Plan!* Use *${data.prefix}plans* to see available options.` }, { quoted: chat });
    }

    const plan = PLANS[planId];
    const userPhone = chat.sender.split("@")[0].replace(/[^0-9]/g, "");
    const paymentLink = `https://courtneytech.xyz/pay/cpanelmesh?phone=${userPhone}&amount=${plan.price}`;

    let msg = `*🚀 UPGRADE TO ${plan.name.toUpperCase()}*\n\n`;
    msg += `You are about to upgrade your account to Premium status.\n\n`;
    msg += `*Plan Details:*\n`;
    msg += `> 📦 Plan: ${plan.name}\n`;
    msg += `> 💰 Amount: KES ${plan.price}\n`;
    msg += `> ⏳ Validity: ${plan.days > 365 ? "Lifetime" : plan.days + " Days"}\n\n`;
    msg += `*Payment Instructions:*\n`;
    msg += `1. Click the link below to pay via M-Pesa:\n`;
    msg += `${paymentLink}\n\n`;
    msg += `2. Once paid, your account will be upgraded automatically.\n`;
    msg += `3. If it doesn't upgrade within 5 minutes, contact the owner.`;

    if (data.isOwner) {
        msg += `\n\n*🛠️ OWNER NOTE:*\nYour webhook URL for Courtney Tech is:\n` + 
               `https://${process.env.RAILWAY_STATIC_URL || "your-app.up.railway.app"}/api/payments/courtneytech`;
    }

    return await MeshTech.sendMessage(chat.chat, { 
        text: msg,
        contextInfo: {
            externalAdReply: {
                title: "MESH-TECH MD PREMIUM",
                body: `Upgrade to ${plan.name}`,
                thumbnailUrl: await getSetting("BOT_PIC"),
                sourceUrl: paymentLink,
                mediaType: 1,
                renderLargerThumbnail: true
            }
        }
    }, { quoted: chat });
});

gmd({
    pattern: "status",
    desc: "Check your subscription status",
    category: "subscription",
    filename: __filename
}, async (MeshTech, chat, data) => {
    const sub = await getUserSubscription(chat.sender);
    
    let msg = `*👤 USER SUBSCRIPTION STATUS*\n\n`;
    msg += `> *User:* @${chat.sender.split("@")[0]}\n`;
    msg += `> *Tier:* ${sub.tier.toUpperCase()}\n`;
    
    if (sub.tier === "premium") {
        const expiry = sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : "Lifetime";
        msg += `> *Expiry:* ${expiry}\n\n`;
        msg += `✅ You have full access to all Premium features.`;
    } else {
        msg += `> *Expiry:* N/A\n\n`;
        msg += `❌ You are currently on the FREE tier. Use *${data.prefix}plans* to upgrade and unlock all features!`;
    }

    return await MeshTech.sendMessage(chat.chat, { text: msg, mentions: [chat.sender] }, { quoted: chat });
});

gmd({
    pattern: "upgrade",
    desc: "Manually upgrade a user (Owner Only)",
    category: "owner",
    filename: __filename
}, async (MeshTech, chat, data) => {
    if (!data.isOwner) return;

    const target = chat.mentionedJid[0] || (chat.quoted ? chat.quoted.sender : null) || (data.args[0] ? data.args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net" : null);
    const days = parseInt(data.args[1]) || 30;

    if (!target) {
        return await MeshTech.sendMessage(chat.chat, { text: `*❌ Usage:* ${data.prefix}upgrade @user <days>` }, { quoted: chat });
    }

    await upgradeUser(target, days);
    
    return await MeshTech.sendMessage(chat.chat, { 
        text: `*✅ SUCCESS!* @${target.split("@")[0]} has been upgraded to *PREMIUM* for ${days} days.`,
        mentions: [target]
    }, { quoted: chat });
});
