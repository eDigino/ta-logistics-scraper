import { connectToDatabase, closeConnection } from './database.js';

async function checkVehicles() {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('vehicles');
    
    // Get total count
    const totalCount = await collection.countDocuments();
    console.log(`Total vehicles in database: ${totalCount}`);
    
    // Get some sample vehicles to see what we actually have
    const vehicles = await collection.find({}).limit(10).toArray();
    console.log('\nSample vehicles:');
    vehicles.forEach((v, i) => {
      console.log(`${i+1}. ${v.name} - Lot: ${v.lotNumber} - Scraped: ${v.scrapedAt}`);
    });
    
    // Check for duplicates by lot number
    const lotNumbers = await collection.distinct('lotNumber');
    console.log(`\nUnique lot numbers: ${lotNumbers.length}`);
    
    // Check recent scrapes
    const recent = await collection.find({}).sort({scrapedAt: -1}).limit(5).toArray();
    console.log('\nMost recent scrapes:');
    recent.forEach((v, i) => {
      console.log(`${i+1}. ${v.name} - ${v.scrapedAt}`);
    });
    
    // Check if we have any vehicles from today's scrape
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayVehicles = await collection.find({
      scrapedAt: { $gte: today }
    }).toArray();
    console.log(`\nVehicles scraped today: ${todayVehicles.length}`);
    
    if (todayVehicles.length > 0) {
      console.log('Today\'s vehicles:');
      todayVehicles.forEach((v, i) => {
        console.log(`${i+1}. ${v.name} - Lot: ${v.lotNumber}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await closeConnection();
  }
}

checkVehicles();
