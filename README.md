# Copart.com Vehicle Scraper

A Node.js web scraper that extracts wholesale vehicle information from Copart.com auction listings.

## Features

- 🚗 Scrapes vehicle data from Copart wholesale auction pages
- 🖼️ Extracts vehicle images  
- 💰 Captures current bid and Buy It Now prices
- 📍 Gets vehicle location information
- 🔢 Records odometer readings
- 🔗 Provides direct links to vehicle details
- 💾 Saves data to JSON format
- 📊 Generates scraping statistics
- 👁️ Runs with visible browser (headless: false) so you can see what's happening

## Data Extracted

For each vehicle, the scraper extracts:

- **Vehicle Name** (Year, Make, Model)
- **Lot Number** (unique identifier)
- **Link** (direct URL to vehicle details page)
- **Image URL** (vehicle thumbnail image)
- **Odometer** (mileage reading)
- **Current Bid** (current auction price)
- **Buy It Now Price** (when available)
- **Location** (state and auction yard)

## Prerequisites

- Node.js (v18 or higher recommended)
- npm
- MongoDB Atlas account (or local MongoDB instance)

## Installation

```bash
npm install
```

This will install Puppeteer, MongoDB driver, and dotenv for environment configuration.

## Database Setup

> 📚 **Having connection issues?** See the detailed [MongoDB Setup Guide](MONGODB_SETUP.md) for step-by-step instructions and troubleshooting.

### 1. Set up MongoDB Atlas (Free Tier)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free account
2. Create a new cluster (M0 Free tier is sufficient)
3. Create a database user:
   - Go to Database Access
   - Add New Database User
   - Choose Password authentication
   - **Use autogenerate password** and copy it immediately
4. Whitelist your IP address:
   - Go to Network Access
   - Add IP Address
   - Choose "Allow Access from Anywhere" (0.0.0.0/0) for development
   - **Wait for status to become "Active"**
5. Get your connection string:
   - Go to Database → Connect
   - Choose "Connect your application"
   - Copy the connection string (looks like: `mongodb+srv://username:<password>@cluster0.xxxxx.mongodb.net/`)

### 2. Configure Environment Variables

1. **Copy the template file:**
   ```bash
   cp env.example .env
   ```

2. **Edit `.env` file with your MongoDB credentials:**
   ```env
   MONGODB_URI=mongodb+srv://your_username:your_password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   DATABASE_NAME=copart_scraper
   COLLECTION_NAME=vehicles
   ```

3. **Replace placeholders:**
   - `your_username` → Your MongoDB Atlas username
   - `your_password` → Your MongoDB Atlas password
   - `cluster0.xxxxx` → Your actual cluster address

### 3. Validate and Test Database Connection

First, validate your configuration:
```bash
npm run validate-env
```

Then test the actual connection:
```bash
npm run test-db
```

This will:
- Test the MongoDB connection
- Display current database statistics
- Confirm everything is working correctly

**If you get errors**, see [MONGODB_SETUP.md](MONGODB_SETUP.md) for detailed troubleshooting.

## Usage

Run the scraper:

```bash
npm start
```

The scraper will:
1. Open a Chrome browser window (visible)
2. Navigate to the Copart wholesale vehicles page
3. Wait for content to load (10 seconds)
4. Handle consent popups automatically
5. Extract vehicle data from multiple pages (2 pages = 40 vehicles)
6. Save results to `vehicles.json`
7. **Save to MongoDB database** (with duplicate prevention)
8. Generate statistics in `scrape-stats.json`
9. Create debug screenshots for each page
10. Keep the browser open for 10 seconds for inspection
11. Close automatically

## Output Files

- **vehicles.json** - Complete vehicle data in JSON format
- **scrape-stats.json** - Statistics about the scraping session
- **debug-screenshot-page*.png** - Screenshots of each page for debugging
- **MongoDB Database** - All vehicles saved to database with metadata

## Database Features

- **Duplicate Prevention** - Uses `lotNumber` as unique identifier
- **Metadata Added** - Scrape timestamp, source, numeric fields for querying
- **Statistics** - Database-level analytics (averages, ranges, counts)
- **Upsert Operations** - Updates existing vehicles or inserts new ones

## Example Output

```json
{
  "name": "2023 CHEVROLET MALIBU LT",
  "lotNumber": "86230495",
  "link": "https://www.copart.com/lot/86230495/...",
  "imageUrl": "https://cs.copart.com/v1/...",
  "odometer": "8 miles",
  "estimatedRetailValue": "",
  "currentBid": "$0",
  "buyItNowPrice": "",
  "location": "GA - Savannah"
}
```

## Customization

You can modify `scraper.js` to:

- Change the target URL to scrape different vehicle categories
- Adjust wait times for slower connections
- Extract additional fields
- Change to headless mode by setting `headless: true`
- Implement pagination to scrape multiple pages
- Add filters for specific vehicle types

## Configuration

In `scraper.js`, you can adjust:

```javascript
// Browser visibility
headless: false  // Set to true for background operation

// Wait time for content loading
await new Promise(resolve => setTimeout(resolve, 10000));  // 10 seconds

// Browser inspection time
await new Promise(resolve => setTimeout(resolve, 10000));  // Keep open 10s
```

## Notes

- **Estimated Retail Value** is not available on search results pages (would require visiting individual lot pages)
- The scraper currently extracts the first page only (~20 vehicles)
- Copart may have anti-scraping measures; use responsibly
- Respect the website's Terms of Service and robots.txt
- Consider adding delays between requests for production use

## Troubleshooting

### MongoDB Connection Issues

#### Error: "MONGODB_URI is not defined"
- Make sure you've created a `.env` file in the project root
- Copy `env.example` to `.env` and fill in your credentials
- Restart the application after creating `.env`

#### Error: "MONGODB_URI contains placeholder values"
- You need to replace the placeholder text in `.env` with actual credentials
- Get your connection string from MongoDB Atlas dashboard
- Don't forget to replace `<password>` with your actual password

#### Error: "MongoServerError: bad auth"
- Your username or password is incorrect
- Verify credentials in MongoDB Atlas → Database Access
- Make sure password doesn't contain special characters that need URL encoding
- If password has special characters, URL encode them (e.g., `@` → `%40`)

#### Error: "Server selection timeout"
- Check your internet connection
- Verify your IP is whitelisted in MongoDB Atlas → Network Access
- Try allowing access from anywhere (0.0.0.0/0) for testing
- Check if your firewall is blocking MongoDB connections

#### TLS/SSL Errors

**This is the most common error!** It usually means:
- ❌ Wrong password in `.env` file
- ❌ Database user doesn't exist or has wrong permissions
- ❌ IP address not whitelisted in MongoDB Atlas

**Quick Fix:**
1. Run `npm run validate-env` to check configuration
2. Go to MongoDB Atlas and verify:
   - Database user exists (Database Access)
   - IP is whitelisted (Network Access → check for 0.0.0.0/0 or your IP)
   - Cluster is running (not paused)
3. Try recreating the database user with a new autogenerated password
4. See [MONGODB_SETUP.md](MONGODB_SETUP.md) for detailed solutions

### Scraping Issues

#### No vehicles found
- Check `debug-screenshot.png` to see what the page looks like
- The page may require login or have changed structure
- Increase wait time if content loads slowly

#### Performance warning (Mac M1/M2)
- The warning about Rosetta translation doesn't affect functionality
- For better performance, use Node.js built for ARM64

#### Timeout errors
- Increase the navigation timeout
- Check your internet connection
- The site may be temporarily unavailable

## License

ISC

## Disclaimer

This tool is for educational purposes. Always respect website terms of service and scraping policies. Use at your own risk.
