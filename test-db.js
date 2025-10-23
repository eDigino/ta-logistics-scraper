import { connectToDatabase, getVehicleStats, closeConnection } from './database.js';

async function testDatabase() {
  try {
    console.log('🧪 Testing MongoDB Connection\n');
    console.log('━'.repeat(50));
    
    // Test connection
    await connectToDatabase();
    console.log('✅ Database connection successful!\n');
    
    // Get stats
    const stats = await getVehicleStats();
    console.log('📊 Database Statistics:');
    console.log(`   Total vehicles: ${stats.totalVehicles || 0}`);
    console.log(`   Average odometer: ${Math.round(stats.avgOdometer || 0).toLocaleString()} mi`);
    console.log(`   Average bid: $${Math.round(stats.avgBid || 0).toLocaleString()}`);
    console.log(`   Bid range: $${Math.round(stats.minBid || 0).toLocaleString()} - $${Math.round(stats.maxBid || 0).toLocaleString()}`);
    console.log(`   Vehicles with Buy It Now: ${stats.vehiclesWithBuyNow || 0}`);
    if (stats.latestScrape) {
      console.log(`   Latest scrape: ${new Date(stats.latestScrape).toLocaleString()}`);
    }
    
    console.log('\n✅ Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  } finally {
    await closeConnection();
  }
}

testDatabase();