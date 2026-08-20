const { DATABASE } = require("./database");
const { DataTypes } = require("sequelize");
const { upgradeUser } = require("./subscription");

const PromoCodeDB = DATABASE.define(
    "PromoCode",
    {
        code: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false,
        },
        days: {
            type: DataTypes.INTEGER,
            defaultValue: 7,
        },
        maxUses: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
        },
        usedCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        tableName: "promo_codes",
        timestamps: true,
    }
);

const RedeemedCodeDB = DATABASE.define(
    "RedeemedCode",
    {
        jid: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false,
        },
        code: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false,
        },
    },
    {
        tableName: "redeemed_codes",
        timestamps: true,
    }
);

async function generatePromoCode(code, days, maxUses, expiryDays = null) {
    const expiresAt = expiryDays ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000) : null;
    return await PromoCodeDB.create({
        code: code.toUpperCase(),
        days,
        maxUses,
        expiresAt
    });
}

async function redeemPromoCode(jid, code) {
    const promo = await PromoCodeDB.findOne({ where: { code: code.toUpperCase() } });
    if (!promo) throw new Error("Invalid promo code.");
    
    if (promo.expiresAt && new Date() > promo.expiresAt) {
        throw new Error("This promo code has expired.");
    }
    
    if (promo.usedCount >= promo.maxUses) {
        throw new Error("This promo code has reached its maximum usage limit.");
    }
    
    const alreadyRedeemed = await RedeemedCodeDB.findOne({ where: { jid, code: promo.code } });
    if (alreadyRedeemed) {
        throw new Error("You have already redeemed this promo code.");
    }
    
    // Redeem
    await upgradeUser(jid, promo.days);
    
    // Update usage
    promo.usedCount += 1;
    await promo.save();
    
    // Record redemption
    await RedeemedCodeDB.create({ jid, code: promo.code });
    
    return promo.days;
}

module.exports = {
    PromoCodeDB,
    RedeemedCodeDB,
    generatePromoCode,
    redeemPromoCode
};
