const { gmd, copyFolderSync } = require("../meshtech");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

gmd(
    {
        pattern: "restart",
        alias: ["reboot"],
        react: "🔄",
        desc: "Restart the bot.",
        category: "owner",
    },
    async (from, Gifted, conText) => {
        const { reply, isSuperUser, react } = conText;

        if (!isSuperUser) {
            await react("❌");
            return reply("❌ Owner Only Command!");
        }

        await reply("🔄 Restarting bot... Please wait.");
        setTimeout(() => {
            process.exit(0);
        }, 2000);
    }
);

gmd(
    {
        pattern: "update",
        alias: ["updatenow", "updt", "sync"],
        react: "🆕",
        desc: "Update the bot to the latest version.",
        category: "owner",
    },
    async (from, Gifted, conText) => {
        const {
            reply,
            isSuperUser,
            react,
            setCommitHash,
            getCommitHash,
        } = conText;

        if (!isSuperUser) {
            await react("❌");
            return reply("❌ Owner Only Command!");
        }

        try {
            const giftedRepo = "mesh057/MESHTECH-V2.5";
            await reply("🔍 Checking for New Updates...");

            const { data: commitData } = await axios.get(
                `https://api.github.com/repos/${giftedRepo}/commits/main`,
            );
            const latestCommitHash = commitData.sha;
            const currentHash = await getCommitHash();

            if (latestCommitHash === currentHash) {
                return reply("✅ Your Bot is Already on the Latest Version!");
            }

            const authorName = commitData.commit.author.name;
            const commitMessage = commitData.commit.message;

            await reply(
                `🔄 Updating Bot...\n\n*Commit Details:*\n👤 Author: ${authorName}\n💬 Message: ${commitMessage}`,
            );

            const zipPath = path.join(__dirname, "..", "update.zip");
            const { data: zipData } = await axios.get(
                `https://github.com/${giftedRepo}/archive/main.zip`,
                { responseType: "arraybuffer" },
            );
            fs.writeFileSync(zipPath, zipData);

            const extractPath = path.join(__dirname, "..", "latest_update");
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(extractPath, true);

            // GitHub zip usually extracts to repo-name-branch
            const sourcePath = path.join(extractPath, "MESHTECH-V2.5-main");
            const destinationPath = path.join(__dirname, "..");

            const excludeList = [
                ".env",
                "meshtech/database/database.db",
                "meshtech/session/session.db",
                "meshtech/session",
                "node_modules",
                ".git"
            ];

            if (fs.existsSync(sourcePath)) {
                copyFolderSync(sourcePath, destinationPath, excludeList);
                await setCommitHash(latestCommitHash);
                
                fs.unlinkSync(zipPath);
                fs.rmSync(extractPath, { recursive: true, force: true });

                await reply("✅ Update Complete! Bot is Restarting...");
                setTimeout(() => {
                    process.exit(0);
                }, 2000);
            } else {
                throw new Error("Source path not found in zip");
            }
        } catch (error) {
            console.error("Update error:", error);
            return reply(
                "❌ Update Failed. Please try by Redeploying Manually on Railway.",
            );
        }
    },
);
