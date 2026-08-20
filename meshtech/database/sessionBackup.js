const { DATABASE } = require("./database");
const { DataTypes } = require("sequelize");

const SessionBackupDB = DATABASE.define(
    "SessionBackup",
    {
        number: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false,
        },
        zipData: {
            type: DataTypes.BLOB("long"),
            allowNull: false,
        },
    },
    {
        tableName: "session_backups",
        timestamps: true,
    }
);

module.exports = { SessionBackupDB };
