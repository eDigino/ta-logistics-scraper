#!/usr/bin/env node

/**
 * Test script to verify API pagination with filters
 */

import fetch from 'node-fetch';

const API_BASE_URL = 'http://96.30.192.167:3000';

async function testFilterPagination() {
    console.log('🧪 Testing API Pagination with Filters...\n');
    
    try {
        // Test 1: Get all vehicles (no filters)
        console.log('1. Testing all vehicles (no filters)...');
        const allResponse = await fetch(`${API_BASE_URL}/api/vehicles?limit=20`);
        const allData = await allResponse.json();
        
        if (allData.success) {
            console.log(`   ✅ Total vehicles: ${allData.pagination.total}`);
            console.log(`   📊 Total pages: ${allData.pagination.pages}`);
            console.log(`   📄 Current page: ${allData.pagination.page}`);
        }
        
        // Test 2: Search for BMW vehicles
        console.log('\n2. Testing BMW search filter...');
        const bmwResponse = await fetch(`${API_BASE_URL}/api/vehicles?search=BMW&limit=20`);
        const bmwData = await bmwResponse.json();
        
        if (bmwData.success) {
            console.log(`   ✅ BMW vehicles found: ${bmwData.pagination.total}`);
            console.log(`   📊 BMW pages: ${bmwData.pagination.pages}`);
            console.log(`   📄 Current page: ${bmwData.pagination.page}`);
            console.log(`   🚗 Vehicles on page: ${bmwData.data.length}`);
        }
        
        // Test 3: Search for BMW on page 2
        console.log('\n3. Testing BMW search on page 2...');
        const bmwPage2Response = await fetch(`${API_BASE_URL}/api/vehicles?search=BMW&limit=20&page=2`);
        const bmwPage2Data = await bmwPage2Response.json();
        
        if (bmwPage2Data.success) {
            console.log(`   ✅ BMW vehicles found: ${bmwPage2Data.pagination.total}`);
            console.log(`   📊 BMW pages: ${bmwPage2Data.pagination.pages}`);
            console.log(`   📄 Current page: ${bmwPage2Data.pagination.page}`);
            console.log(`   🚗 Vehicles on page: ${bmwPage2Data.data.length}`);
        }
        
        // Test 4: Search for non-existent brand
        console.log('\n4. Testing non-existent brand search...');
        const fakeResponse = await fetch(`${API_BASE_URL}/api/vehicles?search=FAKEBRAND123&limit=20`);
        const fakeData = await fakeResponse.json();
        
        if (fakeData.success) {
            console.log(`   ✅ Fake brand vehicles found: ${fakeData.pagination.total}`);
            console.log(`   📊 Fake brand pages: ${fakeData.pagination.pages}`);
            console.log(`   📄 Current page: ${fakeData.pagination.page}`);
            console.log(`   🚗 Vehicles on page: ${fakeData.data.length}`);
        }
        
        // Test 5: Complex filter
        console.log('\n5. Testing complex filter (BMW + price range)...');
        const complexResponse = await fetch(`${API_BASE_URL}/api/vehicles?search=BMW&minBid=1000&maxBid=10000&limit=20`);
        const complexData = await complexResponse.json();
        
        if (complexData.success) {
            console.log(`   ✅ Complex filter vehicles found: ${complexData.pagination.total}`);
            console.log(`   📊 Complex filter pages: ${complexData.pagination.pages}`);
            console.log(`   📄 Current page: ${complexData.pagination.page}`);
            console.log(`   🚗 Vehicles on page: ${complexData.data.length}`);
        }
        
        console.log('\n🎉 API Pagination Test Complete!');
        
    } catch (error) {
        console.error('❌ API Test Error:', error.message);
    }
}

// Run the test
testFilterPagination().catch(console.error);
