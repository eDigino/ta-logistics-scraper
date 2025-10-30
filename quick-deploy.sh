#!/bin/bash

# 🚀 Quick Copart Scraper Deployment
# Server: 96.30.192.167

echo "🚀 Quick Deployment to Ubuntu Server..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SERVER_IP="96.30.192.167"
USERNAME="root"
PASSWORD="M2%j}s9VESC-ami("

echo "📡 Connecting to: $SERVER_IP"
echo ""

# Test connection first
echo "🔍 Testing connection..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$USERNAME@$SERVER_IP" "echo '✅ Connection successful!'"

echo ""
echo "📦 Copying essential files..."
sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no package.json "$USERNAME@$SERVER_IP:/root/"
sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no scraper.js "$USERNAME@$SERVER_IP:/root/"
sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no database.js "$USERNAME@$SERVER_IP:/root/"
sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no api.js "$USERNAME@$SERVER_IP:/root/"
sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no env.example "$USERNAME@$SERVER_IP:/root/"

echo ""
echo "🔧 Installing dependencies and setting up..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$USERNAME@$SERVER_IP" "
cd /root &&
npm install &&
npx puppeteer browsers install chrome &&
cp env.example .env &&
echo '✅ Setup complete!'
"

echo ""
echo "🎉 Quick deployment completed!"
echo ""
echo "📋 Next steps:"
echo "1. SSH: ssh root@96.30.192.167"
echo "2. Edit .env: nano .env"
echo "3. Add MongoDB credentials"
echo "4. Test: node scraper.js"
echo "5. Start API: pm2 start api.js --name copart-api"
echo ""
echo "🌐 API will be at: http://96.30.192.167:3000"
