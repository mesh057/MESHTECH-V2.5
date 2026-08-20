const { DATABASE } = require("./database");
const { DataTypes } = require("sequelize");

const PaymentDB = DATABASE.define(
    "Payment",
    {
        checkoutRequestId: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false,
        },
        jid: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        amount: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        plan: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM("pending", "completed", "failed"),
            defaultValue: "pending",
        },
        receipt: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
    {
        tableName: "payment_logs",
        timestamps: true,
    }
);

module.exports = { PaymentDB };
