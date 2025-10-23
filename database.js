import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = process.env.DATABASE_NAME || 'copart_scraper';
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'vehicles';

let client;
let db;

export async function connectToDatabase() {
  try {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('🔗 Connecting to MongoDB...');
    
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    // Test the connection
    await client.db('admin').command({ ping: 1 });
    console.log('✅ Successfully connected to MongoDB!');
    
    db = client.db(DATABASE_NAME);
    return { client, db };
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    throw error;
  }
}

export async function saveVehicles(vehicles) {
  try {
    if (!db) {
      await connectToDatabase();
    }

    const collection = db.collection(COLLECTION_NAME);
    
    console.log(`💾 Saving ${vehicles.length} vehicles to database...`);
    
    // Process each vehicle with smart upsert logic
    const operations = vehicles.map(vehicle => {
      // Calculate numeric values
      const odometerNumeric = parseInt(vehicle.odometer.replace(/[^\d]/g, '')) || 0;
      const currentBidNumeric = parseFloat(vehicle.currentBid.replace(/[^\d.]/g, '')) || 0;
      const buyItNowNumeric = parseFloat(vehicle.buyItNowPrice.replace(/[^\d.]/g, '')) || null;
      
      return {
        updateOne: {
          filter: { lotNumber: vehicle.lotNumber },
          update: {
            // $set: Update these fields for both new and existing vehicles
            $set: {
              currentBid: vehicle.currentBid,
              currentBidNumeric: currentBidNumeric,
              buyItNowPrice: vehicle.buyItNowPrice,
              buyItNowNumeric: buyItNowNumeric,
              odometer: vehicle.odometer,
              odometerNumeric: odometerNumeric,
              scrapedAt: new Date(),
              lastUpdated: new Date()
            },
            // $setOnInsert: Only set these fields when creating NEW vehicles
            $setOnInsert: {
              lotNumber: vehicle.lotNumber,
              name: vehicle.name,
              link: vehicle.link,
              imageUrl: vehicle.imageUrl,
              location: vehicle.location,
              estimatedRetailValue: vehicle.estimatedRetailValue,
              source: 'copart_scraper',
              createdAt: new Date()
            }
          },
          upsert: true
        }
      };
    });

    const result = await collection.bulkWrite(operations);
    
    console.log(`✅ Database operation completed:`);
    console.log(`   - Matched: ${result.matchedCount} existing vehicles (updated bids/odometer)`);
    console.log(`   - Modified: ${result.modifiedCount} vehicles`);
    console.log(`   - Upserted: ${result.upsertedCount} new vehicles (full data saved)`);
    
    return result;
  } catch (error) {
    console.error('❌ Failed to save vehicles to database:', error.message);
    throw error;
  }
}

export async function getVehicleStats() {
  try {
    if (!db) {
      await connectToDatabase();
    }

    const collection = db.collection(COLLECTION_NAME);
    
    const stats = await collection.aggregate([
      {
        $group: {
          _id: null,
          totalVehicles: { $sum: 1 },
          avgOdometer: { $avg: '$odometerNumeric' },
          avgBid: { $avg: '$currentBidNumeric' },
          minBid: { $min: '$currentBidNumeric' },
          maxBid: { $max: '$currentBidNumeric' },
          vehiclesWithBuyNow: {
            $sum: { $cond: [{ $ne: ['$buyItNowPrice', ''] }, 1, 0] }
          },
          latestScrape: { $max: '$scrapedAt' }
        }
      }
    ]).toArray();

    return stats[0] || {};
  } catch (error) {
    console.error('❌ Failed to get vehicle stats:', error.message);
    throw error;
  }
}

export async function closeConnection() {
  if (client) {
    await client.close();
    console.log('🔌 MongoDB connection closed');
  }
}
