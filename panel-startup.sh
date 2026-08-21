#!/bin/bash
echo "=================================================="
echo "   🚀 MESH-TECH MD v2.5 - Safe-Boot Startup       "
echo "   Developed by Meshack Nzuki                     "
echo "=================================================="

# Ensure node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing core dependencies..."
    npm install --omit=dev --no-audit --no-fund --ignore-scripts
fi

# Ensure local mesh-baileys symlink
if [ -d "mesh-baileys" ]; then
    echo "⚙️ Linking local mesh-baileys modules..."
    mkdir -p node_modules/@whiskeysockets
    rm -rf node_modules/@whiskeysockets/baileys
    ln -s ../mesh-baileys node_modules/@whiskeysockets/baileys
fi

mkdir -p meshtech/database session

echo "🔌 Starting MESH-TECH MD in Safe-Boot Mode..."
while true; do
    node --max-old-space-size=512 index.js
    EXIT_CODE=$?
    echo "⚠️ Bot exited with code $EXIT_CODE. Restarting in 5 seconds..."
    sleep 5
done
