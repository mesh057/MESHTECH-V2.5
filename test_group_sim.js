const { serializeMessage } = require('./meshtech/connection/serializer');

async function runSimulation() {
    console.log("🧪 Starting MESH-TECH MD Group Command Simulation (Private Mode Bypass Check)...");

    const mockGifted = {
        user: { id: '254746844168:0@s.whatsapp.net' }
    };

    const mockMessage = {
        key: {
            remoteJid: '120363000000000000@g.us',
            fromMe: false,
            id: 'SIMULATED_GROUP_MSG_001',
            participant: '254123456789@s.whatsapp.net'
        },
        messageTimestamp: Math.floor(Date.now() / 1000),
        message: {
            extendedTextMessage: {
                text: '.ping'
            }
        }
    };

    // Simulate settings with MODE = private
    const settings = {
        PREFIX: '.',
        MODE: 'private'
    };

    const serialized = await serializeMessage(mockMessage, mockGifted, settings);
    
    console.log("📊 Serialization Output:");
    console.log("-----------------------------------------");
    console.log(`• From (Chat JID): ${serialized.from}`);
    console.log(`• Is Group? ${serialized.isGroup}`);
    console.log(`• Sender JID: ${serialized.sender}`);
    console.log(`• Body: ${serialized.body}`);
    console.log(`• Is Command? ${serialized.isCommand}`);
    console.log(`• Command Name: ${serialized.command}`);
    console.log("-----------------------------------------");

    const isSuperUser = false; // Simulated non-owner group member
    const isGroup = serialized.isGroup;

    // Test the exact gating logic we added to index.js
    const shouldBlockPrivate = settings.MODE?.toLowerCase() === "private" && !isSuperUser && !isGroup;

    console.log(`🔒 Private Mode Gating Check:`);
    console.log(`• MODE: ${settings.MODE}`);
    console.log(`• Is SuperUser: ${isSuperUser}`);
    console.log(`• Is Group: ${isGroup}`);
    console.log(`• Should Block? ${shouldBlockPrivate}`);

    if (shouldBlockPrivate) {
        console.error("❌ FAILED: Group command was incorrectly blocked in private mode!");
        process.exit(1);
    } else {
        console.log("✅ PASSED: Group command successfully bypassed private mode restriction!");
        console.log("🎉 ALL SIMULATION CHECKS PASSED SUCCESSFULLY!");
    }
}

runSimulation().catch(err => {
    console.error("Simulation error:", err);
    process.exit(1);
});
