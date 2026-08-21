#!/bin/bash
echo "=================================================="
echo "   🚀 MESH-TECH MD v2.5 - Universal Panel Boot   "
echo "   Developed by Meshack Nzuki                     "
echo "=================================================="

# Ensure node_modules exists and is clean
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies (Universal Mode)..."
    npm install --omit=dev --no-audit --no-fund --ignore-scripts=false
fi

# Ensure local mesh-baileys symlink if present
if [ -d "mesh-baileys" ]; then
    echo "⚙️ Linking local mesh-baileys modules..."
    mkdir -p node_modules/@whiskeysockets
    rm -rf node_modules/@whiskeysockets/baileys
    ln -s ../mesh-baileys node_modules/@whiskeysockets/baileys
fi

mkdir -p meshtech/database session

echo "🔌 Starting MESH-TECH MD server..."
exec node index.js
