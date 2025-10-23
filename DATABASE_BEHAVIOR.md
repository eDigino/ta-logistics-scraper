# 📊 Database Update Behavior

## Smart Upsert Strategy

The scraper uses MongoDB's **smart upsert** with `$set` and `$setOnInsert` operators to intelligently handle new and existing vehicles.

---

## 🆕 For NEW Vehicles (First Time Scraped)

When a vehicle with a new `lotNumber` is found, **ALL fields are saved**:

### Saved Fields:
- ✅ `lotNumber` - Unique identifier
- ✅ `name` - Vehicle name (e.g., "2020 TOYOTA CAMRY")
- ✅ `link` - Copart listing URL
- ✅ `imageUrl` - Vehicle image
- ✅ `location` - Auction location
- ✅ `estimatedRetailValue` - Retail value estimate
- ✅ `currentBid` - Current bid amount
- ✅ `currentBidNumeric` - Bid as number
- ✅ `odometer` - Mileage reading
- ✅ `odometerNumeric` - Mileage as number
- ✅ `buyItNowPrice` - Buy It Now price
- ✅ `buyItNowNumeric` - Buy It Now as number
- ✅ `source` - Data source ("copart_scraper")
- ✅ `createdAt` - When first added to database
- ✅ `scrapedAt` - When last scraped
- ✅ `lastUpdated` - When last updated

---

## 🔄 For EXISTING Vehicles (Already in Database)

When a vehicle with an existing `lotNumber` is scraped again, **ONLY price/mileage fields are updated**:

### Updated Fields (Dynamic Data):
- ✅ `currentBid` - Latest bid amount
- ✅ `currentBidNumeric` - Latest bid as number
- ✅ `buyItNowPrice` - Latest Buy It Now price
- ✅ `buyItNowNumeric` - Latest Buy It Now as number
- ✅ `odometer` - Latest mileage
- ✅ `odometerNumeric` - Latest mileage as number
- ✅ `scrapedAt` - Updated to current time
- ✅ `lastUpdated` - Updated to current time

### PRESERVED Fields (Static Data):
- 🔒 `lotNumber` - Never changes
- 🔒 `name` - Preserved from original
- 🔒 `link` - Preserved from original
- 🔒 `imageUrl` - Preserved from original
- 🔒 `location` - Preserved from original
- 🔒 `estimatedRetailValue` - Preserved from original
- 🔒 `source` - Preserved from original
- 🔒 `createdAt` - Preserved from original

---

## 📝 Example Workflow

### First Scrape (Day 1):
```javascript
Vehicle: 2020 Toyota Camry
Lot: 12345678
Current Bid: $5,000
Odometer: 50,000 mi
Location: CA - Los Angeles

✅ NEW vehicle created with ALL data
```

### Second Scrape (Day 2):
```javascript
Vehicle: 2020 Toyota Camry
Lot: 12345678 (SAME)
Current Bid: $6,500 (UPDATED ✅)
Odometer: 50,000 mi (SAME)
Location: CA - Los Angeles (PRESERVED 🔒)

✅ ONLY bid updated, location/name preserved
```

### Third Scrape (Day 3):
```javascript
Vehicle: 2020 Toyota Camry
Lot: 12345678 (SAME)
Current Bid: $7,250 (UPDATED ✅)
Odometer: 51,000 mi (UPDATED ✅)
Location: CA - Los Angeles (PRESERVED 🔒)

✅ Bid and odometer updated, other fields preserved
```

---

## 💡 Why This Approach?

### Benefits:

1. **Data Integrity** 🔒
   - Static information (name, location, image) is preserved
   - Prevents accidental data loss from scraping errors
   - Historical data remains consistent

2. **Accurate Tracking** 📊
   - Current prices always up-to-date
   - Odometer changes tracked over time
   - `lastUpdated` shows when data refreshed

3. **Efficient Updates** ⚡
   - Only necessary fields updated
   - Reduces database write operations
   - Preserves original `createdAt` timestamp

4. **No Duplicates** ✅
   - Uses `lotNumber` as unique key
   - Prevents duplicate vehicles in database
   - Handles pagination correctly

---

## 🔍 MongoDB Operations

### Code Implementation:

```javascript
{
  updateOne: {
    filter: { lotNumber: vehicle.lotNumber },
    update: {
      // Update these fields ALWAYS
      $set: {
        currentBid: "$6,500",
        currentBidNumeric: 6500,
        odometer: "51000 mi",
        odometerNumeric: 51000,
        buyItNowPrice: "$15,000",
        buyItNowNumeric: 15000,
        scrapedAt: new Date(),
        lastUpdated: new Date()
      },
      // Set these fields ONLY when creating new vehicle
      $setOnInsert: {
        lotNumber: "12345678",
        name: "2020 TOYOTA CAMRY",
        link: "https://...",
        imageUrl: "https://...",
        location: "CA - Los Angeles",
        estimatedRetailValue: "$20,000",
        source: "copart_scraper",
        createdAt: new Date()
      }
    },
    upsert: true
  }
}
```

---

## 📈 Database Statistics Tracked

The database tracks:
- ✅ Total unique vehicles
- ✅ Average current bid
- ✅ Average odometer reading
- ✅ Bid range (min/max)
- ✅ Vehicles with Buy It Now
- ✅ Latest scrape timestamp

---

## 🚀 Usage

### Run Scraper:
```bash
npm start
```

### Test Database:
```bash
npm run test-db
```

### View API:
```bash
npm run api
```

---

## 🔧 Customization

To change which fields are updated vs preserved, modify `database.js`:

**Fields to ALWAYS update** → Add to `$set` block
**Fields to SET ONCE** → Add to `$setOnInsert` block

---

## ⚠️ Important Notes

1. **`lotNumber` is the unique identifier** - Must never change
2. **First scrape saves everything** - Ensure data quality on initial scrape
3. **Updates are immediate** - Every scrape updates matching vehicles
4. **No duplicates possible** - MongoDB upsert guarantees uniqueness
5. **`createdAt` preserved** - Shows when vehicle first entered database
