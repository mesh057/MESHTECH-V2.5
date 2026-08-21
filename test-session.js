/**
 * MESHTECH-V2.5 Session Verification Script
 * This script verifies that the Mesh-Baileys multi-device session handling
 * works correctly, including SQLite auth state persistence and socket initialization.
 */

const path = require('path');
const fs = require('fs-extra');
const { 
    useSQLiteAuthState, 
    createSocketConfig, 
    latestWaVersion 
} = require('./meshtech');
const { default: meshtechConnect } = require('mesh-baileys');

async function runTest() {
    console.log("🚀 Starting MESHTECH Session Verification...");

    // 1. Setup a temporary test session directory
    const testDir = path.join(__dirname, 'test_session_data');
    const dbPath = path.join(testDir, 'session.db');
    
    if (fs.existsSync(testDir)) {
        fs.removeSync(testDir);
    }
    fs.mkdirSync(testDir, { recursive: true });
    
    console.log(`📂 Created test session directory: ${testDir}`);

    try {
        // 2. Test SQLite Auth State Initialization
        console.log("⚙️ Initializing SQLite Auth State...");
        const { state, saveCreds } = await useSQLiteAuthState(dbPath);
        
        if (!state || !state.creds || !state.keys) {
            throw new Error("❌ Auth state initialization failed: missing state, creds, or keys.");
        }
        console.log("✅ Auth state initialized successfully.");

        // 3. Test Socket Configuration Generation
        console.log("🔧 Generating Socket Configuration...");
        const { version } = await latestWaVersion().catch(() => ({ version: [2, 3000, 1015901307] }));
        const socketConfig = createSocketConfig(version, state, { level: 'silent' });
        
        if (socketConfig.browser[0] !== 'Windows' || socketConfig.auth.creds !== state.creds) {
            throw new Error("❌ Socket configuration mismatch.");
        }
        console.log("✅ Socket configuration generated correctly.");

        // 4. Test Socket Creation (Dry Run)
        console.log("🔌 Attempting Socket Creation (Mesh-Baileys)...");
        const sock = meshtechConnect(socketConfig);
        
        if (!sock || typeof sock.ev.on !== 'function') {
            throw new Error("❌ Mesh-Baileys socket creation failed.");
        }
        console.log("✅ Mesh-Baileys socket created successfully.");

        // 5. Test Credential Persistence
        console.log("💾 Verifying Credential Persistence...");
        state.creds.me = { id: '254746844168@s.whatsapp.net', name: 'MeshTech Test' };
        saveCreds();
        
        const dbExists = fs.existsSync(dbPath);
        if (!dbExists) {
            throw new Error("❌ SQLite database file was not created.");
        }
        
        // Re-initialize to see if it loads the saved data
        const { state: reloadedState } = await useSQLiteAuthState(dbPath);
        if (reloadedState.creds.me?.id !== '254746844168@s.whatsapp.net') {
            throw new Error("❌ Credential persistence failed: reloaded data does not match saved data.");
        }
        console.log("✅ Credential persistence verified.");

        console.log("\n✨ ALL SESSION TESTS PASSED SUCCESSFULLY! ✨");
        console.log("Your Mesh-Baileys multi-device engine is stable and ready for production.");

    } catch (error) {
        console.error("\n❌ TEST FAILED:");
        console.error(error.message);
        process.exit(1);
    } finally {
        // Cleanup
        if (fs.existsSync(testDir)) {
            fs.removeSync(testDir);
            console.log(`\n🧹 Cleaned up test directory.`);
        }
    }
}

runTest();
