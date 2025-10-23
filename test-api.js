import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api';

async function testAPI() {
  console.log('🧪 Testing Copart Vehicles API\n');
  console.log('━'.repeat(50));

  try {
    // Test 1: Health Check
    console.log('1. Health Check:');
    const healthResponse = await fetch(`${API_BASE}/health`);
    const healthData = await healthResponse.json();
    console.log(`   ✅ ${healthData.message} - ${healthData.timestamp}\n`);

    // Test 2: Statistics
    console.log('2. Database Statistics:');
    const statsResponse = await fetch(`${API_BASE}/stats`);
    const statsData = await statsResponse.json();
    if (statsData.success) {
      const stats = statsData.data;
      console.log(`   📊 Total Vehicles: ${stats.totalVehicles}`);
      console.log(`   💰 Average Bid: $${Math.round(stats.avgBid).toLocaleString()}`);
      console.log(`   🚗 Average Odometer: ${Math.round(stats.avgOdometer).toLocaleString()} mi`);
      console.log(`   🛒 Buy It Now Available: ${stats.vehiclesWithBuyNow}`);
      console.log(`   📅 Latest Scrape: ${new Date(stats.latestScrape).toLocaleString()}\n`);
    }

    // Test 3: Get Vehicles (with pagination)
    console.log('3. Get Vehicles (Paginated):');
    const vehiclesResponse = await fetch(`${API_BASE}/vehicles?limit=3`);
    const vehiclesData = await vehiclesResponse.json();
    if (vehiclesData.success) {
      console.log(`   📄 Page: ${vehiclesData.pagination.page}/${vehiclesData.pagination.pages}`);
      console.log(`   📊 Total: ${vehiclesData.pagination.total} vehicles`);
      console.log(`   🚗 Sample vehicles:`);
      vehiclesData.data.forEach((vehicle, index) => {
        console.log(`      ${index + 1}. ${vehicle.name} - ${vehicle.currentBid} (${vehicle.location})`);
      });
      console.log('');
    }

    // Test 4: Search Vehicles
    console.log('4. Search Vehicles (BMW):');
    const searchResponse = await fetch(`${API_BASE}/vehicles?search=BMW&limit=2`);
    const searchData = await searchResponse.json();
    if (searchData.success) {
      console.log(`   🔍 Found ${searchData.pagination.total} BMW vehicles`);
      if (searchData.data.length > 0) {
        searchData.data.forEach((vehicle, index) => {
          console.log(`      ${index + 1}. ${vehicle.name} - ${vehicle.currentBid}`);
        });
      } else {
        console.log('   ℹ️  No BMW vehicles found in current data');
      }
      console.log('');
    }

    // Test 5: Filter by Bid Range
    console.log('5. Filter by Bid Range ($1000-$5000):');
    const bidResponse = await fetch(`${API_BASE}/vehicles?minBid=1000&maxBid=5000&limit=3`);
    const bidData = await bidResponse.json();
    if (bidData.success) {
      console.log(`   💰 Found ${bidData.pagination.total} vehicles in bid range`);
      if (bidData.data.length > 0) {
        bidData.data.forEach((vehicle, index) => {
          console.log(`      ${index + 1}. ${vehicle.name} - ${vehicle.currentBid}`);
        });
      } else {
        console.log('   ℹ️  No vehicles in this bid range');
      }
      console.log('');
    }

    // Test 6: Get Locations
    console.log('6. Available Locations:');
    const locationsResponse = await fetch(`${API_BASE}/locations`);
    const locationsData = await locationsResponse.json();
    if (locationsData.success) {
      console.log(`   📍 ${locationsData.data.length} unique locations:`);
      locationsData.data.slice(0, 5).forEach((location, index) => {
        console.log(`      ${index + 1}. ${location}`);
      });
      if (locationsData.data.length > 5) {
        console.log(`      ... and ${locationsData.data.length - 5} more`);
      }
      console.log('');
    }

    // Test 7: Get Recent Vehicles
    console.log('7. Recent Vehicles (Last 24h):');
    const recentResponse = await fetch(`${API_BASE}/vehicles/recent`);
    const recentData = await recentResponse.json();
    if (recentData.success) {
      console.log(`   ⏰ ${recentData.data.length} vehicles scraped in last 24h`);
      if (recentData.data.length > 0) {
        recentData.data.slice(0, 3).forEach((vehicle, index) => {
          console.log(`      ${index + 1}. ${vehicle.name} - ${new Date(vehicle.scrapedAt).toLocaleString()}`);
        });
      }
      console.log('');
    }

    // Test 8: Get Specific Vehicle (if available)
    if (vehiclesData.success && vehiclesData.data.length > 0) {
      const lotNumber = vehiclesData.data[0].lotNumber;
      console.log(`8. Get Specific Vehicle (Lot: ${lotNumber}):`);
      const specificResponse = await fetch(`${API_BASE}/vehicles/${lotNumber}`);
      const specificData = await specificResponse.json();
      if (specificData.success) {
        const vehicle = specificData.data;
        console.log(`   🚗 ${vehicle.name}`);
        console.log(`   💰 Bid: ${vehicle.currentBid}`);
        console.log(`   📍 Location: ${vehicle.location}`);
        console.log(`   🛣️  Odometer: ${vehicle.odometer}`);
        console.log(`   🔗 Link: ${vehicle.link}`);
        console.log('');
      }
    }

    console.log('✅ All API tests completed successfully!');
    console.log('\n🌐 Frontend available at: api-frontend.html');
    console.log('📚 API Documentation: API_README.md');

  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

testAPI();
