const { serializeMessage } = require('./meshtech/connection/serializer');

async function runSimulation() {
    console.log("🧪 Starting MESH-TECH MD Group Command Simulation...");

    // Mock MeshTech socket
    const mockMeshTech = {
        user: {
            id: '254746844168:0@s.whatsapp.net',
            name: 'MESH-TECH MD'
        }
    };

    // Mock Settings
    const mockSettings = {
        PREFIX: '.'
    };

    // Mock WhatsApp Group Message with Ephemeral Wrapping (the edge case)
    const mockGroupMessage = {
        key: {
            remoteJid: '120363000000000000@g.us', // Group JID
            participant: '254123456789@s.whatsapp.net', // Sender Participant JID
            id: 'MSG123456789',
            fromMe: false
        },
        message: {
            ephemeralMessage: {
                message: {
                    conversation: '.admins'
                }
            }
        },
        pushName: 'Test Group User'
    };

    console.log("📥 Testing incoming group message with ephemeral wrapper...");
    const serialized = await serializeMessage(mockGroupMessage, mockMeshTech, mockSettings);

    console.log("\n📊 Serialization Output:");
    console.log("-----------------------------------------");
    console.log(`• From (Chat JID): ${serialized.from}`);
    console.log(`• Is Group? ${serialized.isGroup}`);
    console.log(`• Sender JID: ${serialized.sender}`);
    console.log(`• Body: ${serialized.body}`);
    console.log(`• Is Command? ${serialized.isCommand}`);
    console.log(`• Command Name: ${serialized.command}`);
    console.log("-----------------------------------------");

    // Assertions
    let success = true;
    if (!serialized.isGroup) {
        console.error("❌ FAILED: isGroup is false!");
        success = false;
    } else {
        console.log("✅ PASSED: isGroup is correctly true.");
    }

    if (serialized.sender === serialized.from) {
        console.error("❌ FAILED: sender is still matching remoteJid (Group JID)! Bug detected.");
        success = false;
    } else if (serialized.sender === '254123456789@s.whatsapp.net') {
        console.log("✅ PASSED: sender correctly resolved to participant JID.");
    } else {
        console.warn("⚠️ WARNING: sender is: " + serialized.sender);
    }

    if (!serialized.isCommand || serialized.command !== 'admins') {
        console.error("❌ FAILED: Command not parsed correctly!");
        success = false;
    } else {
        console.log("✅ PASSED: Command '.admins' successfully parsed.");
    }

    if (success) {
        console.log("\n🎉 ALL SIMULATION CHECKS PASSED SUCCESSFULLY!");
    } else {
        console.log("\n❌ SIMULATION FOUND INCONSISTENCIES.");
    }
}

runSimulation().catch(err => {
    console.error("Simulation crashed:", err);
});
