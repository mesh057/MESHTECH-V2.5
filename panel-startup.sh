#!/bin/bash
echo "=================================================="
echo "   🚀 MESH-TECH MD v2.5 - Pterodactyl Startup     "
echo "   Developed by Meshack Nzuki                     "
echo "=================================================="

# Ensure node_modules symlink/postinstall runs correctly
if [ -d "mesh-baileys" ]; then
    echo "⚙️ Setting up local mesh-baileys modules..."
    mkdir -p node_modules/@whiskeysockets
    rm -rf node_modules/@whiskeysockets/baileys
    ln -s ../mesh-baileys node_modules/@whiskeysockets/baileys
fi

# Check for database and session directories
mkdir -p meshtech/database session

echo "🔌 Starting MESH-TECH MD main process..."
node index.js
