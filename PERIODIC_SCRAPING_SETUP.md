# Periodic Scraping Setup - Complete ✅

## Server Configuration

**Server:** 96.30.192.167  
**OS:** Ubuntu 22.04 LTS  
**Status:** ✅ Fully operational

## What's Been Set Up

### 1. ✅ Scraper Configuration
- **Location:** `/root/copart-scraper/scraper-chrome.js`
- **Mode:** Headless (background operation)
- **Chrome:** System Chrome installed at `/usr/bin/google-chrome-stable`
- **Features:**
  - Scrapes up to 10 pages (1000 vehicles)
  - Saves vehicles to MongoDB after each page
  - Retry logic for failed page clicks
  - Duplicate detection by `lotNumber`

### 2. ✅ Cron Job
- **Schedule:** Every 10 minutes (`*/10 * * * *`)
- **Command:** `/root/run-scraper.sh`
- **Status:** Active and running

### 3. ✅ Wrapper Script
- **Location:** `/root/run-scraper.sh`
- **Purpose:** Runs scraper with proper environment (xvfb for headless Chrome)
- **Logs:** Outputs to `/var/log/copart-scraper.log`

### 4. ✅ MongoDB Connection
- **Database:** `copart_scraper`
- **Collection:** `vehicles`
- **Connection:** Successfully configured and tested
- **Behavior:** Smart upsert (updates existing vehicles, inserts new ones)

## Verification

### Test the scraper manually:
```bash
ssh root@96.30.192.167
cd /root/copart-scraper
xvfb-run -a node scraper-chrome.js
```

### Check cron job:
```bash
ssh root@96.30.192.167
crontab -l
```

### View logs:
```bash
ssh root@96.30.192.167
tail -f /var/log/copart-scraper.log
```

### Check recent scrapes:
```bash
ssh root@96.30.192.167
tail -100 /var/log/copart-scraper.log | grep "Successfully saved"
```

## Current Status

✅ **Scraper:** Working correctly  
✅ **Chrome:** Installed and configured  
✅ **MongoDB:** Connected and saving data  
✅ **Cron Job:** Active (runs every 10 minutes)  
✅ **Logging:** Working properly  

## Maintenance

### To stop the periodic scraping:
```bash
ssh root@96.30.192.167
crontab -e
# Remove or comment out the line: */10 * * * * /root/run-scraper.sh
```

### To restart the periodic scraping:
```bash
ssh root@96.30.192.167
crontab -e
# Add: */10 * * * * /root/run-scraper.sh
```

### To change the schedule:
Edit the cron job:
- `*/10 * * * *` = Every 10 minutes
- `*/30 * * * *` = Every 30 minutes
- `0 * * * *` = Every hour
- `0 */6 * * *` = Every 6 hours

## Files

- **Scraper:** `/root/copart-scraper/scraper-chrome.js`
- **Wrapper:** `/root/run-scraper.sh`
- **Logs:** `/var/log/copart-scraper.log`
- **Config:** `/root/copart-scraper/.env`

## Success Indicators

✅ Scraper starts without errors  
✅ MongoDB connection successful  
✅ Vehicles saved to database  
✅ Multiple pages scraped successfully  
✅ No browser crashes or detached frame errors  

## Next Steps

The scraper will automatically:
1. Run every 10 minutes
2. Scrape up to 10 pages (1000 vehicles)
3. Save vehicles to MongoDB after each page
4. Update existing vehicles or insert new ones
5. Log all activity to `/var/log/copart-scraper.log`

**No further action needed - the system is fully automated!** 🎉
