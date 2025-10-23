import express from 'express';
import cors from 'cors';
import { connectToDatabase, getVehicleStats, closeConnection } from './database.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Import database functions
let db;

// Connect to database on startup
async function initializeDatabase() {
  try {
    const { db: database } = await connectToDatabase();
    db = database;
    console.log('✅ Database connected for API');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    process.exit(1);
  }
}

// Routes

// Get all vehicles with pagination and filtering
app.get('/api/vehicles', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      minBid = '',
      maxBid = '',
      minOdometer = '',
      maxOdometer = '',
      location = '',
      sortBy = 'scrapedAt',
      sortOrder = 'desc'
    } = req.query;

    const collection = db.collection('vehicles');
    
    // Build filter object
    const filter = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { lotNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (minBid || maxBid) {
      filter.currentBidNumeric = {};
      if (minBid) filter.currentBidNumeric.$gte = parseFloat(minBid);
      if (maxBid) filter.currentBidNumeric.$lte = parseFloat(maxBid);
    }
    
    if (minOdometer || maxOdometer) {
      filter.odometerNumeric = {};
      if (minOdometer) filter.odometerNumeric.$gte = parseInt(minOdometer);
      if (maxOdometer) filter.odometerNumeric.$lte = parseInt(maxOdometer);
    }
    
    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get total count
    const total = await collection.countDocuments(filter);

    // Get vehicles
    const vehicles = await collection
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    res.json({
      success: true,
      data: vehicles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vehicles'
    });
  }
});

// Get vehicle by lot number
app.get('/api/vehicles/:lotNumber', async (req, res) => {
  try {
    const { lotNumber } = req.params;
    const collection = db.collection('vehicles');
    
    const vehicle = await collection.findOne({ lotNumber });
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found'
      });
    }

    res.json({
      success: true,
      data: vehicle
    });

  } catch (error) {
    console.error('Error fetching vehicle:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vehicle'
    });
  }
});

// Get database statistics
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getVehicleStats();
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// Get unique locations
app.get('/api/locations', async (req, res) => {
  try {
    const collection = db.collection('vehicles');
    
    const locations = await collection.distinct('location');
    const filteredLocations = locations.filter(loc => loc && loc.trim() !== '');
    
    res.json({
      success: true,
      data: filteredLocations.sort()
    });

  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch locations'
    });
  }
});

// Get recent vehicles (last 24 hours)
app.get('/api/vehicles/recent', async (req, res) => {
  try {
    const collection = db.collection('vehicles');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const recentVehicles = await collection
      .find({
        scrapedAt: { $gte: yesterday }
      })
      .sort({ scrapedAt: -1 })
      .limit(50)
      .toArray();

    res.json({
      success: true,
      data: recentVehicles
    });

  } catch (error) {
    console.error('Error fetching recent vehicles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent vehicles'
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
async function startServer() {
  await initializeDatabase();
  
  app.listen(PORT, () => {
    console.log(`🚀 API Server running on http://localhost:${PORT}`);
    console.log(`📊 Available endpoints:`);
    console.log(`   GET /api/vehicles - Get all vehicles (with pagination & filters)`);
    console.log(`   GET /api/vehicles/:lotNumber - Get specific vehicle`);
    console.log(`   GET /api/stats - Get database statistics`);
    console.log(`   GET /api/locations - Get unique locations`);
    console.log(`   GET /api/vehicles/recent - Get recent vehicles (24h)`);
    console.log(`   GET /api/health - Health check`);
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down API server...');
  await closeConnection();
  process.exit(0);
});

startServer().catch(console.error);
