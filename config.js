const fs = require("fs-extra");
if (fs.existsSync(".env"))
    require("dotenv").config({ path: __dirname + "/.env", quiet: true });

module.exports = {
    MODE: process.env.MODE || process.env.MESH_MULTI_USER_SESSION_MODE || "public",
    SESSION_ID: process.env.SESSION_ID,
    TIME_ZONE: process.env.TIME_ZONE,
    AUTO_READ_STATUS: process.env.AUTO_READ_STATUS,
    AUTO_LIKE_STATUS: process.env.AUTO_LIKE_STATUS,
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_DIR: process.env.AUTH_DIR || process.env.MULTI_USER_AUTH_DIR,
    SESSION_DB_FILE: process.env.SESSION_DB_FILE,
    DATA_FILE: process.env.DATA_FILE || process.env.MESH_DATA_FILE,
    MESSAGE_STORE_FILE: process.env.MESSAGE_STORE_FILE,
};

let fileName = require.resolve(__filename);
fs.watchFile(fileName, () => {
    fs.unwatchFile(fileName);
    console.log(`Writing File: ${__filename}`);
    delete require.cache[fileName];
    require(fileName);
});
