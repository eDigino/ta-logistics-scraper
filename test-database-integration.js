import { connectToDatabase, saveVehicles, getVehicleStats, closeConnection } from './database.js';

async function testDatabaseIntegration() {
  try {
    console.log('🧪 Testing Database Integration with Sample Data\n');
    console.log('━'.repeat(50));
    
    // Test connection
    await connectToDatabase();
    console.log('✅ Database connection successful!\n');
    
    // Create sample vehicle data (like what the scraper would produce)
    const sampleVehicles = [
      {
        name: "2023 CHEVROLET MALIBU LT",
        lotNumber: "86230495",
        link: "https://www.copart.com/lot/86230495/clean-title-2023-chevrolet-malibu-lt-ga-savannah",
        imageUrl: "https://cs.copart.com/v1/AUTH_svc.pdoc/00000/86230495/86230495_1.JPG",
        odometer: "8 miles",
        estimatedRetailValue: "$25,000",
        currentBid: "$0",
        buyItNowPrice: "",
        location: "GA - Savannah"
      },
      {
        name: "2022 FORD F-150 XLT",
        lotNumber: "86230496",
        link: "https://www.copart.com/lot/86230496/clean-title-2022-ford-f-150-xlt-tx-houston",
        imageUrl: "https://cs.copart.com/v1/AUTH_svc.pdoc/00000/86230496/86230496_1.JPG",
        odometer: "45,000 miles",
        estimatedRetailValue: "$35,000",
        currentBid: "$15,000",
        buyItNowPrice: "$28,000",
        location: "TX - Houston"
      }
    ];
    
    console.log('💾 Saving sample vehicles to database...');
    const saveResult = await saveVehicles(sampleVehicles);
    console.log('✅ Sample vehicles saved successfully!\n');
    
    // Get database statistics
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
    
    console.log('\n✅ Database integration test completed successfully!');
    console.log('🎉 Your scraper is ready to save data to MongoDB!');
    
  } catch (error) {
    console.error('❌ Database integration test failed:', error.message);
  } finally {
    await closeConnection();
  }
}

testDatabaseIntegration();
