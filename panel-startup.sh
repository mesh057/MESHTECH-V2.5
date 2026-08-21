#!/bin/bash
echo "=================================================="
echo "   🚀 MESH-TECH MD v2.5 - Pterodactyl Startup     "
echo "   Developed by Meshack Nzuki                     "
echo "=================================================="

# Check if node_modules exists, if not run npm install
if [ ! -d "node_modules" ] || [ ! -f "node_modules/@whiskeysockets/baileys/package.json" ]; then
    echo "📦 Installing required dependencies (this may take a few minutes on first boot)..."
    npm install --omit=dev --no-audit --no-fund
fi

# Ensure local mesh-baileys symlink
if [ -d "mesh-baileys" ]; then
    echo "⚙️ Linking local mesh-baileys modules..."
    mkdir -p node_modules/@whiskeysockets
    rm -rf node_modules/@whiskeysockets/baileys
    ln -s ../mesh-baileys node_modules/@whiskeysockets/baileys
fi

# Create required directories
mkdir -p meshtech/database session

echo "🔌 Starting MESH-TECH MD server..."
while true; do
    node index.js
    EXIT_CODE=$?
    echo "⚠️ Bot process exited with code $EXIT_CODE. Restarting in 5 seconds..."
    sleep 5
done
