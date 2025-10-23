# 🚗 Copart Vehicles API

A RESTful API to access scraped vehicle data from Copart.com, built with Express.js and MongoDB.

## 🚀 Quick Start

1. **Start the API server:**
   ```bash
   npm run api
   ```

2. **Open the frontend:**
   - Open `api-frontend.html` in your browser
   - Or visit: `http://localhost:3000` (if serving static files)

## 📊 API Endpoints

### Base URL: `http://localhost:3000/api`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/vehicles` | GET | Get all vehicles with pagination & filtering |
| `/vehicles/:lotNumber` | GET | Get specific vehicle by lot number |
| `/stats` | GET | Get database statistics |
| `/locations` | GET | Get unique locations |
| `/vehicles/recent` | GET | Get recent vehicles (last 24 hours) |
| `/health` | GET | Health check |

## 🔍 Query Parameters

### `/vehicles` endpoint supports:

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `search` - Search in vehicle name or lot number
- `minBid` - Minimum bid amount
- `maxBid` - Maximum bid amount
- `minOdometer` - Minimum odometer reading
- `maxOdometer` - Maximum odometer reading
- `location` - Filter by location
- `sortBy` - Sort field (scrapedAt, currentBidNumeric, odometerNumeric, name)
- `sortOrder` - Sort order (asc, desc)

### Example Requests:

```bash
# Get first page of vehicles
GET /api/vehicles?page=1&limit=10

# Search for BMW vehicles
GET /api/vehicles?search=BMW

# Filter by bid range
GET /api/vehicles?minBid=1000&maxBid=5000

# Sort by bid amount (highest first)
GET /api/vehicles?sortBy=currentBidNumeric&sortOrder=desc

# Get vehicles from specific location
GET /api/vehicles?location=Atlanta

# Get recent vehicles
GET /api/vehicles/recent
```

## 📝 Response Format

All responses follow this format:

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### Error Response:
```json
{
  "success": false,
  "error": "Error message"
}
```

## 🎨 Frontend Features

The included `api-frontend.html` provides:

- **📊 Statistics Dashboard** - Overview of database stats
- **🔍 Advanced Search** - Filter by multiple criteria
- **📍 Location Filter** - Dropdown with all available locations
- **📄 Pagination** - Navigate through large datasets
- **📱 Responsive Design** - Works on mobile and desktop
- **⚡ Real-time Search** - Instant results as you type

## 🛠️ Development

### Project Structure:
```
├── api.js              # Express.js API server
├── api-frontend.html   # Frontend interface
├── database.js         # MongoDB connection & functions
├── scraper.js          # Web scraper (populates database)
└── package.json        # Dependencies & scripts
```

### Available Scripts:
- `npm run api` - Start API server
- `npm start` - Run scraper
- `npm run test-db` - Test database connection

## 🔧 Configuration

The API uses the same environment variables as the scraper:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
DATABASE_NAME=copart_scraper
COLLECTION_NAME=vehicles
```

## 📈 Performance

- **Pagination** - Prevents large data transfers
- **Indexing** - MongoDB indexes on common query fields
- **Caching** - Consider adding Redis for production
- **Rate Limiting** - Add rate limiting for production use

## 🚀 Production Deployment

For production deployment:

1. **Environment Variables:**
   ```bash
   export NODE_ENV=production
   export PORT=3000
   ```

2. **Process Manager:**
   ```bash
   npm install -g pm2
   pm2 start api.js --name "copart-api"
   ```

3. **Reverse Proxy:**
   - Use Nginx or Apache
   - Configure SSL/TLS
   - Set up rate limiting

4. **Monitoring:**
   - Add logging (Winston)
   - Health checks
   - Error tracking (Sentry)

## 🔒 Security Considerations

- **Input Validation** - Validate all query parameters
- **Rate Limiting** - Prevent API abuse
- **CORS** - Configure allowed origins
- **Authentication** - Add API keys for production
- **HTTPS** - Use SSL in production

## 📊 Example Usage

### JavaScript/Fetch:
```javascript
// Get vehicles with filters
const response = await fetch('/api/vehicles?search=BMW&minBid=1000');
const data = await response.json();

// Get specific vehicle
const vehicle = await fetch('/api/vehicles/12345678');
const vehicleData = await vehicle.json();
```

### cURL:
```bash
# Get all vehicles
curl "http://localhost:3000/api/vehicles"

# Search for specific vehicle
curl "http://localhost:3000/api/vehicles?search=BMW"

# Get statistics
curl "http://localhost:3000/api/stats"
```

## 🐛 Troubleshooting

### Common Issues:

1. **API not starting:**
   - Check if port 3000 is available
   - Verify MongoDB connection
   - Check environment variables

2. **No data returned:**
   - Run scraper first: `npm start`
   - Check database connection: `npm run test-db`

3. **CORS errors:**
   - API includes CORS middleware
   - Check browser console for errors

4. **Slow responses:**
   - Add MongoDB indexes
   - Implement caching
   - Use pagination

## 📞 Support

For issues or questions:
1. Check the console logs
2. Verify database connection
3. Test with the included frontend
4. Check API health endpoint: `/api/health`
