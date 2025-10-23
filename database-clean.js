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
    
    // Add metadata to each vehicle
    const vehiclesWithMetadata = vehicles.map(vehicle => ({
      ...vehicle,
      scrapedAt: new Date(),
      source: 'copart_scraper',
      // Convert odometer to number for easier querying
      odometerNumeric: parseInt(vehicle.odometer.replace(/[^\d]/g, '')) || 0,
      // Convert bid to number for easier querying
      currentBidNumeric: parseFloat(vehicle.currentBid.replace(/[^\d.]/g, '')) || 0,
      // Convert buy it now to number
      buyItNowNumeric: parseFloat(vehicle.buyItNowPrice.replace(/[^\d.]/g, '')) || null
    }));

    console.log(`💾 Saving ${vehiclesWithMetadata.length} vehicles to database...`);
    
    // Use upsert to avoid duplicates based on lotNumber
    const operations = vehiclesWithMetadata.map(vehicle => ({
      updateOne: {
        filter: { lotNumber: vehicle.lotNumber },
        update: { $set: vehicle },
        upsert: true
      }
    }));

    const result = await collection.bulkWrite(operations);
    
    console.log(`✅ Database operation completed:`);
    console.log(`   - Matched: ${result.matchedCount} vehicles`);
    console.log(`   - Modified: ${result.modifiedCount} vehicles`);
    console.log(`   - Upserted: ${result.upsertedCount} new vehicles`);
    
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
