#!/bin/bash
echo "=================================================="
echo "   🚀 MESH-TECH MD v2.5 - Pterodactyl Startup     "
echo "   Developed by Meshack Nzuki                     "
echo "=================================================="

# 1. Check for basic source code integrity
if [ ! -f "index.js" ] || [ ! -f "package.json" ]; then
    echo "❌ ERROR: Core files (index.js or package.json) are missing!"
    echo "Please ensure you have uploaded and EXTRACTED the ZIP file in your File Manager."
    echo "Current Disk Usage: $(du -sh .)"
    exit 1
fi

# 2. Install fs-extra and dotenv first (needed by config.js)
if [ ! -d "node_modules/fs-extra" ] || [ ! -d "node_modules/dotenv" ]; then
    echo "📦 Installing core dependencies..."
    npm install fs-extra dotenv --no-audit --no-fund
fi

# 3. Install all other dependencies
if [ ! -d "node_modules/@whiskeysockets/baileys" ] && [ ! -d "mesh-baileys" ]; then
    echo "📦 Installing all bot dependencies (this may take a moment)..."
    npm install --omit=dev --no-audit --no-fund
fi

# 4. Ensure local mesh-baileys symlink
if [ -d "mesh-baileys" ]; then
    echo "⚙️ Linking local mesh-baileys modules..."
    mkdir -p node_modules/@whiskeysockets
    rm -rf node_modules/@whiskeysockets/baileys
    ln -s ../mesh-baileys node_modules/@whiskeysockets/baileys
fi

# 5. Create required directories
mkdir -p meshtech/database session

echo "🔌 Starting MESH-TECH MD server..."
while true; do
    # Run with memory limit flag for 512MB panels
    node --max-old-space-size=450 index.js
    EXIT_CODE=$?
    echo "⚠️ Bot process exited with code $EXIT_CODE. Restarting in 5 seconds..."
    sleep 5
done
