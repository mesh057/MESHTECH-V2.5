const { gmd, getUserSubscription, upgradeUser } = require("../meshtech");
const { generatePromoCode, redeemPromoCode } = require("../meshtech/database/promoCode");
const { getSetting } = require("../meshtech/database/settings");

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
}, async (from, MeshTech, conText) => {
    const { botPrefix, reply, mek } = conText;
    const prefix = botPrefix || ".";
    
    let msg = `*💎 MESH-TECH MD PREMIUM PLANS*\n\n`;
    for (const [id, plan] of Object.entries(PLANS)) {
        msg += `*${id}. ${plan.name}*\n`;
        msg += `> 💰 Price: KSH ${plan.price}\n`;
        msg += `> ✨ ${plan.description}\n\n`;
    }
    msg += `_To buy a plan, use: *${prefix}buy <plan_number>*_\n`;
    msg += `_Example: *${prefix}buy 1*_`;
    
    return await MeshTech.sendMessage(from, { text: msg }, { quoted: mek });
});

gmd({
    pattern: "buy",
    desc: "Purchase a Premium subscription",
    category: "subscription",
    filename: __filename
}, async (from, MeshTech, conText) => {
    const { args, botPrefix, reply, mek, sender, isSuperUser } = conText;
    const prefix = botPrefix || ".";
    const planId = args[0];
    
    if (!planId || !PLANS[planId]) {
        return reply(`*❌ Invalid Plan!* Use *${prefix}plans* to see available options.`);
    }

    const plan = PLANS[planId];
    const userPhone = sender.split("@")[0].replace(/[^0-9]/g, "");
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
    msg += `👉 *${prefix}verify <TransactionID>*\n\n`;
    msg += `_Your account will be upgraded instantly upon verification!_`;

    if (isSuperUser) {
        msg += `\n\n*🛠️ OWNER NOTE:*\nYour webhook URL for Courtney Tech is:\n` + 
               `https://${process.env.RAILWAY_STATIC_URL || "your-app.up.railway.app"}/api/payments/courtneytech`;
    }

    let thumbnailUrl;
    try {
        thumbnailUrl = await getSetting("BOT_PIC");
    } catch (e) {
        thumbnailUrl = undefined;
    }

    return await MeshTech.sendMessage(from, { 
        text: msg,
        contextInfo: {
            externalAdReply: {
                title: "MESH-TECH MD PREMIUM",
                body: `Upgrade to ${plan.name} - KSH ${plan.price}`,
                thumbnailUrl: thumbnailUrl || "https://i.postimg.cc/vHZz7VWG/bot-logo.png",
                sourceUrl: paymentLink,
                mediaType: 1,
                renderLargerThumbnail: true
            }
        }
    }, { quoted: mek });
});

gmd({
    pattern: "verify",
    desc: "Verify payment transaction ID and upgrade account",
    category: "subscription",
    filename: __filename
}, async (from, MeshTech, conText) => {
    const { reply, args, botPrefix } = conText;
    const prefix = botPrefix || ".";
    const txId = args[0];
    
    if (!txId) {
        return reply(`❌ Please provide your transaction ID.\n\nExample: *${prefix}verify CTX123456789*`);
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
            
            await upgradeUser(sender, days);
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
}, async (from, MeshTech, conText) => {
    const { sender, botPrefix, mek } = conText;
    const prefix = botPrefix || ".";
    const sub = await getUserSubscription(sender);
    
    let msg = `*👤 USER SUBSCRIPTION STATUS*\n\n`;
    msg += `> *User:* @${sender.split("@")[0]}\n`;
    msg += `> *Tier:* ${sub.tier.toUpperCase()}\n`;
    
    if (sub.tier === "premium") {
        const expiry = sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : "Lifetime";
        msg += `> *Expiry:* ${expiry}\n\n`;
        msg += `✅ You have full access to all Premium features.`;
    } else {
        msg += `> *Expiry:* N/A\n\n`;
        msg += `❌ You are currently on the FREE tier. Use *${prefix}plans* to upgrade and unlock all features!`;
    }

    return await MeshTech.sendMessage(from, { 
        text: msg,
        mentions: [sender]
    }, { quoted: mek });
});

gmd({
    pattern: "upgrade",
    desc: "Manually upgrade a user (Owner Only)",
    category: "owner",
    filename: __filename
}, async (from, MeshTech, conText) => {
    const { isSuperUser, args, reply, botPrefix } = conText;
    const prefix = botPrefix || ".";

    if (!isSuperUser) {
        return reply("❌ This command is restricted to the bot owner.");
    }

    const target = args[0];
    const days = parseInt(args[1]) || 35;

    if (!target) {
        return reply(`❌ Please specify a user.\n\nExample: *${prefix}upgrade 2547XXXXXXXX 35*`);
    }

    const jid = target.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
    await upgradeUser(jid, days);

    return reply(`✅ Successfully upgraded *@${jid.split("@")[0]}* to PREMIUM for ${days} days.`);
});

gmd({
    pattern: "gencode",
    desc: "Generate a giveaway promo code (Owner Only)",
    category: "owner",
    filename: __filename
}, async (from, MeshTech, conText) => {
    const { isSuperUser, args, reply, botPrefix } = conText;
    const prefix = botPrefix || ".";

    if (!isSuperUser) return reply("❌ This command is restricted to the bot owner.");

    const code = args[0];
    const days = parseInt(args[1]) || 7;
    const maxUses = parseInt(args[2]) || 1;

    if (!code) {
        return reply(`❌ Usage: *${prefix}gencode <CODE> <days> <max_uses>*\n\nExample: *${prefix}gencode MESH-FREE-7 7 10*`);
    }

    try {
        await generatePromoCode(code, days, maxUses);
        return reply(`✅ *Promo Code Generated!*\n\n> 🎟️ Code: *${code.toUpperCase()}*\n> ⏳ Duration: ${days} Days\n> 👥 Max Uses: ${maxUses}\n\nShare this code with your users!`);
    } catch (e) {
        return reply(`❌ Error generating code: ${e.message}`);
    }
});

gmd({
    pattern: "redeem",
    desc: "Redeem a giveaway promo code",
    category: "subscription",
    filename: __filename
}, async (from, MeshTech, conText) => {
    const { sender, args, reply } = conText;
    const code = args[0];

    if (!code) {
        return reply("❌ Please provide a promo code to redeem.\n\nExample: *.redeem MESH-FREE-7*");
    }

    try {
        const days = await redeemPromoCode(sender, code);
        return reply(`🎉 *Congratulations!*\n\nYou have successfully redeemed the code *${code.toUpperCase()}*.\n\nYour account has been upgraded to *PREMIUM* for ${days} days!`);
    } catch (e) {
        return reply(`❌ *Redemption Failed:* ${e.message}`);
    }
});

gmd({
    pattern: "wallet",
    desc: "View your payment wallet and subscription history",
    category: "subscription",
    filename: __filename
}, async (from, MeshTech, conText) => {
    const { sender, botPrefix, mek } = conText;
    const prefix = botPrefix || ".";
    
    try {
        const sub = await getUserSubscription(sender);
        const userPhone = sender.split("@")[0].replace(/[^0-9]/g, "");
        
        let msg = `*🏦 MESH-TECH MD DIGITAL WALLET*\n\n`;
        msg += `> *Account:* @${userPhone}\n`;
        msg += `> *Status:* ${sub.tier.toUpperCase()}\n`;
        
        if (sub.tier === "premium") {
            const now = Date.now();
            const expiry = sub.expiresAt ? new Date(sub.expiresAt) : null;
            
            if (expiry) {
                const diff = expiry.getTime() - now;
                const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
                
                msg += `> *Remaining:* ${daysLeft > 0 ? daysLeft : 0} Days\n`;
                msg += `> *Expiry Date:* ${expiry.toLocaleDateString()}\n\n`;
                
                if (daysLeft <= 5) {
                    msg += `⚠️ *Warning:* Your subscription is expiring soon! Use *${prefix}plans* to renew.\n\n`;
                } else {
                    msg += `✅ Your account is in good standing. Thank you for your support!\n\n`;
                }
            } else {
                msg += `> *Remaining:* Lifetime Access\n\n`;
            }
        } else {
            msg += `> *Remaining:* 0 Days\n\n`;
            msg += `❌ Your wallet is currently empty of Premium days.\n\n`;
            msg += `*How to add funds?*\n`;
            msg += `1. Type *${prefix}plans* to see options.\n`;
            msg += `2. Type *${prefix}buy <number>* to get a payment link.\n`;
        }
        
        msg += `_All payments are securely processed via M-Pesa._`;

        let thumbnailUrl;
        try {
            thumbnailUrl = await getSetting("BOT_PIC");
        } catch (e) {
            thumbnailUrl = "https://i.postimg.cc/vHZz7VWG/bot-logo.png";
        }

        return await MeshTech.sendMessage(from, { 
            text: msg,
            mentions: [sender],
            contextInfo: {
                externalAdReply: {
                    title: "MESH-TECH MD WALLET",
                    body: `Subscription Status: ${sub.tier.toUpperCase()}`,
                    thumbnailUrl: thumbnailUrl,
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: mek });
    } catch (error) {
        console.error("Wallet command error:", error);
        return MeshTech.sendMessage(from, { text: "❌ Error accessing wallet data. Please try again later." }, { quoted: mek });
    }
});
