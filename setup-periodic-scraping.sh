#!/bin/bash

# Setup periodic scraping on the server
# This script sets up a cron job to run the scraper every 10 minutes

echo "🔄 Setting up periodic scraping..."

# Create a wrapper script for the scraper that includes proper environment
cat > /root/run-scraper.sh << 'EOF'
#!/bin/bash
cd /root/ta-logistics-scrape
export NODE_ENV=production
xvfb-run -a node scraper.js >> /var/log/copart-scraper.log 2>&1
EOF

# Make the wrapper script executable
chmod +x /root/run-scraper.sh

# Create log directory if it doesn't exist
mkdir -p /var/log

# Set up cron job to run every 10 minutes
echo "Setting up cron job to run every 10 minutes..."
(crontab -l 2>/dev/null; echo "*/10 * * * * /root/run-scraper.sh") | crontab -

# Show current crontab
echo "Current crontab:"
crontab -l

# Test the wrapper script
echo "Testing scraper wrapper script..."
/root/run-scraper.sh

echo "✅ Periodic scraping setup complete!"
echo "📝 Scraper will run every 10 minutes"
echo "📋 Logs are saved to /var/log/copart-scraper.log"
echo "🔍 To view logs: tail -f /var/log/copart-scraper.log"
echo "🛑 To stop: crontab -e (remove the scraper line)"
