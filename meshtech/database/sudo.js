const { DATABASE } = require('./database');
const { DataTypes } = require('sequelize');

const SudoDB = DATABASE.define('SudoUser', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
}, {
    tableName: 'sudo_users',
    timestamps: true,
});

async function initializeSudoDB() {
    await SudoDB.sync();
}

let _sudoCache = null;

async function getSudoNumbers() {
    await initializeSudoDB();
    if (_sudoCache) return _sudoCache;
    const records = await SudoDB.findAll();
    _sudoCache = records.map(record => record.number);
    return _sudoCache;
}

async function setSudo(number) {
    await initializeSudoDB();
    try {
        const [record, created] = await SudoDB.findOrCreate({
            where: { number: number },
            defaults: { number: number },
        });
        _sudoCache = null;
        return created;
    } catch (error) {
        console.error('[SUDO][SET_ERROR]:', error);
        return false;
    }
}

async function delSudo(number) {
    await initializeSudoDB();
    try {
        const deleted = await SudoDB.destroy({
            where: { number: number },
        });
        _sudoCache = null;
        return deleted > 0;
    } catch (error) {
        console.error('[SUDO][DEL_ERROR]:', error);
        return false;
    }
}

async function clearAllSudo() {
    await initializeSudoDB();
    try {
        const deleted = await SudoDB.destroy({ where: {} });
        _sudoCache = null;
        return deleted;
    } catch (error) {
        console.error('[SUDO][CLEAR_ALL_ERROR]:', error);
        return 0;
    }
}

async function isSuperUser(jid, MeshTech) {
    if (!jid) return false;
    const num = jid.split("@")[0].split(":")[0];
    if (!num) return false;
    
    // Check if it's the bot itself
    if (MeshTech?.user?.id) {
        const botNum = MeshTech.user.id.split(":")[0];
        if (num === botNum) return true;
    }
    
    // Check owner number from settings/env
    const ownerNum = process.env.OWNER_NUMBER || "254746844168";
    if (num === String(ownerNum).replace(/\D/g, "")) return true;
    
    // Check persisted sudo numbers
    const sudoList = await getSudoNumbers();
    if (sudoList.some(s => String(s).replace(/\D/g, "") === num)) return true;

    return false;
}

module.exports = {
    SudoDB,
    getSudoNumbers,
    setSudo,
    delSudo,
    clearAllSudo,
    isSuperUser,
};
