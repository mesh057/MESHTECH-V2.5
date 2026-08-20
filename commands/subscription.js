const { gmd, getUserSubscription, upgradeUser, config, getSetting } = require("../meshtech");

const PLANS = {
    "1": { name: "Starter (35 Days)", price: 70, days: 35, description: "Full access to all AI & Research tools for 35 days." },
    "2": { name: "Standard (2 Months)", price: 140, days: 60, description: "Full access to all AI & Research tools for 2 months." },
    "3": { name: "Quarterly (3 Months)", price: 210, days: 90, description: "Full access to all AI & Research tools for 3 months." },
    "4": { name: "Extended (5 Months)", price: 350, days: 150, description: "Full access to all AI & Research tools for 5 months." },
    "5": { name: "Semi-Annual (6 Months)", price: 420, days: 180, description: "Full access to all AI & Research tools for 6 months." },
    "6": { name: "Annual (1 Year)", price: 840, days: 365, description: "Full access to all AI & Research tools for 1 full year." }
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
        msg += `> 💰 Price: KSH ${plan.price}\n`;
        msg += `> ✨ ${plan.description}\n\n`;
    }
    msg += `_To buy a plan, use: *${data.prefix}buy <plan_number>*_\n`;
    msg += `_Example: *${data.prefix}buy 1*_`;
    
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
    msg += `> 💰 Amount: KSH ${plan.price}\n\n`;
    msg += `*Payment Instructions:*\n`;
    msg += `1. Click the link below to pay via M-Pesa:\n`;
    msg += `👉 ${paymentLink}\n\n`;
    msg += `2. Once paid, copy your Transaction ID and reply with:\n`;
    msg += `👉 *${data.prefix}verify <TransactionID>*\n\n`;
    msg += `_Your account will be upgraded instantly upon verification!_`;

    if (data.isOwner) {
        msg += `\n\n*🛠️ OWNER NOTE:*\nYour webhook URL for Courtney Tech is:\n` + 
               `https://${process.env.RAILWAY_STATIC_URL || "your-app.up.railway.app"}/api/payments/courtneytech`;
    }

    return await MeshTech.sendMessage(chat.chat, { 
        text: msg,
        contextInfo: {
            externalAdReply: {
                title: "MESH-TECH MD PREMIUM",
                body: `Upgrade to ${plan.name} - KSH ${plan.price}`,
                thumbnailUrl: await getSetting("BOT_PIC"),
                sourceUrl: paymentLink,
                mediaType: 1,
                renderLargerThumbnail: true
            }
        }
    }, { quoted: chat });
});

gmd({
    pattern: "verify",
    desc: "Verify payment transaction ID and upgrade account",
    category: "subscription",
    filename: __filename
}, async (MeshTech, chat, data) => {
    const { reply, args } = data;
    const txId = args[0];
    
    if (!txId) {
        return reply(`❌ Please provide your transaction ID.\n\nExample: *${data.prefix}verify CTX123456789*`);
    }

    try {
        const { verifyTransactionApi } = require("../meshtech/payments/courtney");
        const res = await verifyTransactionApi(txId);
        
        if (res && (res.status === 'success' || res.status === 'completed')) {
            const amount = Number(res.amount) || 70;
            let days = 35;
            if (amount >= 800) days = 365;
            else if (amount >= 400) days = 180;
            else if (amount >= 300) days = 150;
            else if (amount >= 200) days = 90;
            else if (amount >= 130) days = 60;
            else days = 35;
            
            await upgradeUser(chat.sender, days);
            return reply(`✅ *Payment Verified Successfully!*\n\nYour account has been upgraded to *PREMIUM* for ${days} days. Enjoy all high-speed AI and research features!`);
        } else {
            return reply(`❌ Transaction *${txId}* could not be verified or is still pending payment.`);
        }
    } catch (error) {
        return reply(`❌ Verification Error: ${error.message}\n\nPlease ensure your API keys are correctly configured or contact the owner.`);
    }
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

    return await MeshTech.sendMessage(chat.chat, { 
        text: msg,
        mentions: [chat.sender]
    }, { quoted: chat });
});

gmd({
    pattern: "upgrade",
    desc: "Manually upgrade a user (Owner Only)",
    category: "owner",
    filename: __filename
}, async (MeshTech, chat, data) => {
    if (!data.isOwner) {
        return await chat.reply("❌ This command is restricted to the bot owner.");
    }

    const target = data.args[0];
    const days = parseInt(data.args[1]) || 35;

    if (!target) {
        return await chat.reply(`❌ Please specify a user.\n\nExample: *${data.prefix}upgrade 2547XXXXXXXX 35*`);
    }

    const jid = target.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
    await upgradeUser(jid, days);

    return await chat.reply(`✅ Successfully upgraded *@${jid.split("@")[0]}* to PREMIUM for ${days} days.`);
});
