#!/bin/bash
echo "=================================================="
echo "   🚀 MESH-TECH MD v2.5 - Low-Power Startup       "
echo "   Developed by Meshack Nzuki                     "
echo "=================================================="

# 1. Check for basic source code integrity
if [ ! -f "index.js" ] || [ ! -f "package.json" ]; then
    echo "❌ ERROR: Core files missing! Ensure you EXTRACTED the ZIP."
    exit 1
fi

# 2. Low-Memory Installation Strategy
# We install modules one by one to avoid exceeding the 128MB RAM limit
if [ ! -d "node_modules" ]; then
    echo "📦 [LOW-POWER] Starting chunked dependency installation..."
    
    # Essential Core
    npm install dotenv express axios pino --no-audit --no-fund --prefer-offline --maxsockets 1
    
    # Database Core
    npm install sequelize sqlite3 better-sqlite3 pg --no-audit --no-fund --prefer-offline --maxsockets 1
    
    # Media Core
    npm install fs-extra jimp sharp ruhend-scraper --no-audit --no-fund --prefer-offline --maxsockets 1
    
    # Rest of the modules
    echo "📦 [LOW-POWER] Finalizing installation..."
    npm install --omit=dev --no-audit --no-fund --prefer-offline --maxsockets 1
fi

# 3. Ensure local mesh-baileys symlink
if [ -d "mesh-baileys" ]; then
    echo "⚙️ Linking local mesh-baileys modules..."
    mkdir -p node_modules/@whiskeysockets
    rm -rf node_modules/@whiskeysockets/baileys
    ln -s ../mesh-baileys node_modules/@whiskeysockets/baileys
fi

# 4. Create required directories
mkdir -p meshtech/database session

echo "🔌 Starting MESH-TECH MD server (Memory Optimized)..."
while true; do
    # Force low memory usage for Node.js
    node --max-old-space-size=90 --gc-interval=100 index.js
    EXIT_CODE=$?
    echo "⚠️ Bot exited with code $EXIT_CODE. Restarting in 10 seconds..."
    sleep 10
done
