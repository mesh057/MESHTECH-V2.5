const { DATABASE } = require("./database");
const { DataTypes } = require("sequelize");

const SubscriptionDB = DATABASE.define(
    "Subscription",
    {
        jid: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false,
        },
        tier: {
            type: DataTypes.ENUM("free", "premium"),
            defaultValue: "free",
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        tableName: "user_subscriptions",
        timestamps: true,
    }
);

async function getUserSubscription(jid) {
    let sub = await SubscriptionDB.findOne({ where: { jid } });
    if (!sub) {
        sub = await SubscriptionDB.create({ jid, tier: "free" });
    }
    
    // Check if expired
    if (sub.tier === "premium" && sub.expiresAt && new Date() > sub.expiresAt) {
        sub.tier = "free";
        await sub.save();
    }
    
    return sub;
}

async function upgradeUser(jid, days) {
    let sub = await getUserSubscription(jid);
    const now = new Date();
    let newExpiry;

    if (sub.tier === "premium" && sub.expiresAt && sub.expiresAt > now) {
        // Extend existing
        newExpiry = new Date(sub.expiresAt.getTime() + days * 24 * 60 * 60 * 1000);
    } else {
        // New premium
        newExpiry = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    }

    sub.tier = "premium";
    sub.expiresAt = newExpiry;
    await sub.save();
    return sub;
}

module.exports = {
    SubscriptionDB,
    getUserSubscription,
    upgradeUser,
};
