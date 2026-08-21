const { gmd, copyFolderSync } = require("../meshtech");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

gmd(
    {
        pattern: "restart",
        aliases: ["reboot"],
        react: "🔄",
        description: "Restart the bot.",
        category: "owner",
    },
    async (from, MeshTech, conText) => {
        const { reply, isSuperUser, react } = conText;

        if (!isSuperUser) {
            await react("❌");
            return reply("❌ Owner Only Command!");
        }

        await reply("🔄 Restarting bot... Please wait.");
        setTimeout(() => {
            process.exit(1);
        }, 3000);
    }
);

gmd(
    {
        pattern: "update",
        aliases: ["updatenow", "updt", "sync"],
        react: "🆕",
        description: "Update the bot to the latest version.",
        category: "owner",
    },
    async (from, MeshTech, conText) => {
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
            const meshtechRepo = "mesh057/MESHTECH-V2.5";
            await reply("🔍 Checking for New Updates...");

            const { data: commitData } = await axios.get(
                `https://api.github.com/repos/${meshtechRepo}/commits/main`,
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
                `https://github.com/${meshtechRepo}/archive/main.zip`,
                { responseType: "arraybuffer" },
            );
            fs.writeFileSync(zipPath, zipData);

            const extractPath = path.join(__dirname, "..", "latest_update");
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(extractPath, true);

            // GitHub zip usually extracts to repo-name-branch
            let sourcePath = path.join(extractPath, "MESHTECH-V2.5-main");
            if (!fs.existsSync(sourcePath)) {
                // Fallback: check if the folder name is just the repo name
                const folders = fs.readdirSync(extractPath).filter(f => fs.statSync(path.join(extractPath, f)).isDirectory());
                if (folders.length > 0) sourcePath = path.join(extractPath, folders[0]);
            }
            
            const destinationPath = path.join(__dirname, "..");

            const excludeList = [
                ".env",
                "meshtech/database/database.db",
                "meshtech/session/session.db",
                "meshtech/session",
                "auth_sessions",
                "node_modules",
                ".git"
            ];

            if (fs.existsSync(sourcePath)) {
                copyFolderSync(sourcePath, destinationPath, excludeList);
                await setCommitHash(latestCommitHash);
                
                if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
                fs.rmSync(extractPath, { recursive: true, force: true });

                const isMultiUser = process.env.MESH_MULTI_USER_SESSION_OWNER ? true : false;
                await reply(`✅ Update Complete! Bot is ${isMultiUser ? "Restarting (Managed)..." : "Restarting..."}`);
                
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
