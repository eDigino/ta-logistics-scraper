#!/bin/bash

# 🚀 Copart Scraper Deployment Script for Ubuntu Server
# Server: 96.30.192.167
# Username: root

echo "🚀 Starting Copart Scraper Deployment..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Server details
SERVER_IP="96.30.192.167"
USERNAME="root"
PASSWORD="M2%j}s9VESC-ami("
PROJECT_NAME="copart-scraper"

echo "📡 Connecting to server: $SERVER_IP"
echo "👤 Username: $USERNAME"
echo "📁 Project: $PROJECT_NAME"
echo ""

# Function to run commands on remote server
run_remote() {
    sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$USERNAME@$SERVER_IP" "$1"
}

# Function to copy files to remote server
copy_to_remote() {
    sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no -r "$1" "$USERNAME@$SERVER_IP:$2"
}

echo "🔧 Step 1: Updating system packages..."
run_remote "apt update && apt upgrade -y"

echo "🔧 Step 2: Installing Node.js 16.x..."
run_remote "curl -fsSL https://deb.nodesource.com/setup_16.x | bash -"
run_remote "apt install -y nodejs"

echo "🔧 Step 3: Installing Chrome dependencies for Puppeteer..."
run_remote "apt install -y gconf-service libasound2 libatk1.0-0 libatk-bridge2.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget"

echo "🔧 Step 4: Installing PM2 process manager..."
run_remote "npm install -g pm2"

echo "🔧 Step 5: Creating project directory..."
run_remote "mkdir -p /root/$PROJECT_NAME"
run_remote "cd /root/$PROJECT_NAME"

echo "📦 Step 6: Copying project files..."
copy_to_remote "./" "/root/$PROJECT_NAME/"

echo "🔧 Step 7: Installing project dependencies..."
run_remote "cd /root/$PROJECT_NAME && npm install"

echo "🔧 Step 8: Installing Puppeteer Chrome..."
run_remote "cd /root/$PROJECT_NAME && npx puppeteer browsers install chrome"

echo "🔧 Step 9: Setting up environment file..."
run_remote "cd /root/$PROJECT_NAME && cp env.example .env"
echo "⚠️  IMPORTANT: You need to edit .env file with your MongoDB credentials!"
echo "   Run: nano /root/$PROJECT_NAME/.env"

echo "🔧 Step 10: Setting up PM2 startup script..."
run_remote "pm2 startup"
run_remote "pm2 save"

echo "🔧 Step 11: Starting API server with PM2..."
run_remote "cd /root/$PROJECT_NAME && pm2 start api.js --name copart-api"

echo "🔧 Step 12: Setting up cron job for scraper (every 6 hours)..."
run_remote "echo '0 */6 * * * cd /root/$PROJECT_NAME && /usr/bin/node scraper.js >> /var/log/copart-scraper.log 2>&1' | crontab -"

echo "🔧 Step 13: Setting up firewall..."
run_remote "ufw allow 22"
run_remote "ufw allow 3000"
run_remote "ufw --force enable"

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "📊 Next steps:"
echo "1. SSH into server: ssh root@96.30.192.167"
echo "2. Edit .env file: nano /root/$PROJECT_NAME/.env"
echo "3. Add your MongoDB credentials"
echo "4. Test API: curl http://localhost:3000/api/health"
echo "5. Test scraper: cd /root/$PROJECT_NAME && node scraper.js"
echo ""
echo "🌐 API will be available at: http://96.30.192.167:3000"
echo "📊 PM2 status: pm2 status"
echo "📝 View logs: pm2 logs copart-api"
echo "🔄 Restart API: pm2 restart copart-api"
echo ""
echo "🎉 Your Copart scraper is now deployed and running!"
