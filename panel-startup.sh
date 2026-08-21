#!/bin/bash
echo "=================================================="
echo "   🚀 MESH-TECH MD v2.5 - Katabump Startup        "
echo "   Developed by Meshack Nzuki                     "
echo "=================================================="

# 1. Check for basic source code integrity
if [ ! -f "index.js" ] || [ ! -f "package.json" ]; then
    echo "❌ ERROR: Core files missing! Ensure you EXTRACTED the ZIP."
    exit 1
fi

# 2. Katabump installation with Sharp platform correction
if [ ! -d "node_modules" ] || [ ! -d "node_modules/sharp" ]; then
    echo "📦 [KATABUMP] Installing dependencies..."
    npm install --omit=dev --no-audit --no-fund
    
    echo "🔧 [KATABUMP] Rebuilding sharp binary for Linux x64..."
    npm install --platform=linux --arch=x64 sharp --force
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

echo "🔌 Starting MESH-TECH MD server on Katabump..."
while true; do
    # Katabump has generous RAM, use standard or slightly higher memory limit
    node --max-old-space-size=768 index.js
    EXIT_CODE=$?
    echo "⚠️ Bot exited with code $EXIT_CODE. Restarting in 5 seconds..."
    sleep 5
done
