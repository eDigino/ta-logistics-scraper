import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import { connectToDatabase, saveVehicles, getVehicleStats, closeConnection } from './database.js';

// Search URL Options:
// Option 1 (WORKING): Limited but reliable - 'https://www.copart.com/lotSearchResults?free=false&displayStr=AUTOMOBILE'
// Option 2 (MORE RESULTS): Remove free filter - 'https://www.copart.com/lotSearchResults?displayStr=AUTOMOBILE'
// Option 3 (ALL VEHICLES): No filters - 'https://www.copart.com/lotSearchResults' (causes 404 on pagination)
const COPART_URL = 'https://www.copart.com/lotSearchResults?displayStr=AUTOMOBILE'; // More results, should work with pagination

async function scrapeCopartVehicles() {
  console.log('🚀 Starting Copart scraper...');
  
  const browser = await puppeteer.launch({
    headless: false, // Browser window visible
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--window-size=1920,1080'
    ]
  });

  try {
    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Remove webdriver indicators
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });
    
    let allVehicles = [];
    let currentPage = 1;
    const maxPages = 1; // Only need 1 page since we'll show 100 vehicles per page
    const maxAttempts = 3;
    
    while (currentPage <= maxPages) {
      console.log(`\n📄 Scraping Page ${currentPage}/${maxPages}...`);
      
      let pageVehicles = [];
      let attempt = 0;
      
      while (pageVehicles.length === 0 && attempt < maxAttempts) {
        attempt++;
        
        if (attempt > 1) {
          console.log(`🔄 Attempt ${attempt}/${maxAttempts}: Reloading page...`);
        } else if (currentPage === 1) {
          console.log('📡 Navigating to Copart...');
        }
        
        // Navigate to the page
        const pageUrl = currentPage === 1 ? COPART_URL : `${COPART_URL}&page=${currentPage}`;
        await page.goto(pageUrl, { 
          waitUntil: 'domcontentloaded',
          timeout: 60000 
        });

        // Wait for content to load
        console.log('⏳ Waiting for content to load (10 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Check for 404 error or no results
        const pageContent = await page.content();
        if (pageContent.includes('404 Error') || pageContent.includes('Sorry, we can\'t find that page')) {
          console.log(`❌ Page ${currentPage} returned 404 error - no more pages available`);
          break; // Exit the page loop
        }
        
        // Handle consent popup if it appears (only on first page)
        if (currentPage === 1) {
          try {
            console.log('🔍 Checking for consent popup...');
            
            // Try multiple selectors for the consent button
            const consentSelectors = [
              'button:contains("Consent")',
              'button[class*="consent"]',
              'button[class*="accept"]',
              'button:has-text("Consent")',
              'button:has-text("Accept")',
              'button:has-text("Agree")'
            ];
            
            let consentButton = null;
            for (const selector of consentSelectors) {
              try {
                consentButton = await page.$(selector);
                if (consentButton) break;
              } catch (e) {
                // Try next selector
              }
            }
            
            // Also try to find by text content
            if (!consentButton) {
              consentButton = await page.evaluateHandle(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                return buttons.find(btn => 
                  btn.textContent.toLowerCase().includes('consent') ||
                  btn.textContent.toLowerCase().includes('accept') ||
                  btn.textContent.toLowerCase().includes('agree')
                );
              });
            }
            
            if (consentButton && await consentButton.evaluate(el => el !== null)) {
              console.log('✅ Found consent popup, clicking "Consent"...');
              await consentButton.click();
              await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for popup to close
            } else {
              console.log('ℹ️  No consent popup found');
            }
          } catch (error) {
            console.log('ℹ️  No consent popup to handle');
          }
        }
        
        // Change page size to show 100 vehicles per page (only on first page)
        if (currentPage === 1) {
          try {
            console.log('🔧 Changing page size to 100 vehicles per page...');
            
            // Look for the page size dropdown (found: .p-paginator-rpp-options)
            const pageSizeDropdown = await page.$('.p-paginator-rpp-options');
            
            let pageSizeChanged = false;
            
            if (pageSizeDropdown) {
              try {
                console.log('✅ Found page size dropdown');
                
                // Click on the dropdown to open it
                await pageSizeDropdown.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Look for option with "100" using evaluate
                const option100 = await page.evaluateHandle(() => {
                  const items = Array.from(document.querySelectorAll('li, .p-dropdown-item, [data-value]'));
                  return items.find(item => 
                    item.textContent.includes('100') || 
                    item.getAttribute('data-value') === '100'
                  );
                });
                
                if (option100 && await option100.evaluate(el => el !== null)) {
                  await option100.click();
                  console.log('✅ Changed page size to 100');
                  pageSizeChanged = true;
                } else {
                  console.log('⚠️  Option "100" not found in dropdown');
                }
              } catch (e) {
                console.log('⚠️  Error clicking dropdown:', e.message);
              }
            } else {
              console.log('⚠️  Page size dropdown not found');
            }
            
            if (pageSizeChanged) {
              console.log('⏳ Waiting for page to reload with 100 vehicles...');
              await new Promise(resolve => setTimeout(resolve, 5000));
            } else {
              console.log('⚠️  Could not find page size dropdown, continuing with default (20 per page)');
            }
          } catch (error) {
            console.log('⚠️  Error changing page size:', error.message);
          }
        }
        
        // Take screenshot (with error handling)
        try {
          await page.screenshot({ path: `debug-screenshot-page${currentPage}-attempt${attempt}.png`, fullPage: true });
          console.log(`📸 Screenshot saved (page ${currentPage}, attempt ${attempt})`);
        } catch (screenshotError) {
          console.log(`⚠️  Screenshot failed: ${screenshotError.message}`);
        }

        console.log('🔍 Extracting vehicle data...');
        
        // First, let's see what's on the page
        const pageInfo = await page.evaluate(() => {
          const allLinks = document.querySelectorAll('a');
          const lotLinks = document.querySelectorAll('a[href*="/lot/"]');
          const bodyText = document.body.innerText.substring(0, 500);
          
          return {
            totalLinks: allLinks.length,
            lotLinks: lotLinks.length,
            bodyPreview: bodyText
          };
        });
        
        console.log(`   Total links on page: ${pageInfo.totalLinks}`);
        console.log(`   Links with '/lot/': ${pageInfo.lotLinks}`);
        console.log(`   Page text preview: ${pageInfo.bodyPreview.substring(0, 200)}...`);
      
        // Extract vehicle data
        pageVehicles = await page.evaluate(() => {
      const results = [];
      
      // Look for all vehicle links - Copart uses specific URL pattern
      const vehicleLinks = Array.from(document.querySelectorAll('a[href*="/lot/"]'))
        .filter(link => {
          const href = link.getAttribute('href');
          return href && href.match(/\/lot\/\d+\//);
        });
      
      console.log('Found vehicle links:', vehicleLinks.length);
      
      const seenLots = new Set();
      
      vehicleLinks.forEach((linkElement, index) => {
        try {
          const href = linkElement.getAttribute('href');
          const lotMatch = href.match(/\/lot\/(\d+)\//);
          
          if (!lotMatch) {
            return;
          }
          
          if (seenLots.has(lotMatch[1])) {
            return;
          }
          
          const lotNumber = lotMatch[1];
          seenLots.add(lotNumber);
          
          // Find the card/container for this vehicle first
          const container = linkElement.closest('[class*="card"], [class*="item"], [class*="lot-"], div, li, tr') || linkElement.parentElement;
          
          // Extract vehicle name - try multiple sources
          let name = '';
          const containerText = container.textContent;
          
          // Try 1: Look in the container for vehicle name patterns
          // Pattern: Year Make Model (e.g., "2023 CHEVROLET MALIBU LT")
          const yearPattern = containerText.match(/\b(19|20)\d{2}\s+[A-Z][A-Z\s-]+/);
          if (yearPattern) {
            name = yearPattern[0].trim().split('\n')[0].trim();
            // Limit length to avoid grabbing too much text
            if (name.length > 60) {
              name = name.substring(0, 60);
            }
          }
          
          // Try 2: Link text content (if pattern didn't work)
          if (!name || name.length < 5) {
            name = linkElement.textContent.trim();
          }
          
          // Try 3: Title attribute
          if (!name || name.length < 5 || name === 'Lot Image') {
            name = linkElement.getAttribute('title') || '';
          }
          
          // Try 4: Extract from URL as last resort
          if (!name || name.length < 5 || name === 'Lot Image') {
            // URL format: /lot/12345/clean-title-2023-chevrolet-malibu-lt-ga-savannah
            const urlParts = href.match(/\/lot\/\d+\/[^\/]*-(\d{4}-[a-z-]+)-[a-z]{2}-/i);
            if (urlParts) {
              name = urlParts[1].replace(/-/g, ' ').toUpperCase();
            }
          }
          
          // Skip navigation/menu links
          if (!name || name.includes('{{') || 
              name.toLowerCase().includes('driver seat') ||
              name.toLowerCase().includes('my lots') ||
              name.length > 200) {
            return;
          }
          
          // Clean up name - sometimes it has extra text
          name = name.split('\n')[0].trim();
          
          // If name is still too short, skip
          if (name.length < 3) {
            return;
          }
          
          // Look for image in the container
          let imageUrl = '';
          const imgElement = container.querySelector('img');
          if (imgElement) {
            imageUrl = imgElement.getAttribute('src') || imgElement.getAttribute('data-src') || imgElement.getAttribute('data-lazy') || '';
            if (imageUrl && imageUrl.startsWith('//')) {
              imageUrl = 'https:' + imageUrl;
            } else if (imageUrl && imageUrl.startsWith('/') && !imageUrl.startsWith('//')) {
              imageUrl = 'https://www.copart.com' + imageUrl;
            }
          }
          
          // Build full link
          const fullLink = href.startsWith('http') ? href : 'https://www.copart.com' + href;
          
          // Extract additional data from the container (containerText already declared above)
          
          // Extract odometer - look for "Odometer" label followed by a number
          let odometer = '';
          
          // Method 1: Look for "Odometer" text followed by any sequence of digits (with or without commas)
          const odoMatch1 = containerText.match(/Odometer[:\s]+([\d,]+)\s*(?:\((?:ACTUAL|EXEMPT|NOT ACTUAL|TMU)\))?/i);
          if (odoMatch1) {
            // Remove commas and add " mi" suffix
            odometer = odoMatch1[1].replace(/,/g, '') + ' mi';
          } else {
            // Method 2: Fallback - look for number + "miles" or "mi"  
            const odoMatch2 = containerText.match(/([\d,]+)\s*(?:mi|miles|km)/i);
            if (odoMatch2) {
              odometer = odoMatch2[1].replace(/,/g, '') + ' mi';
            }
          }
          
          // Extract estimated retail value
          let estimatedValue = '';
          const estMatches = containerText.match(/(?:Est|Estimated|ERV|Retail)[:\s]*(\$[\d,]+)/i);
          if (estMatches) {
            estimatedValue = estMatches[1];
          }
          
          // Extract current bid
          let currentBid = '';
          const bidMatches = containerText.match(/(?:Current\s*Bid|Bid)[:\s]*(\$[\d,]+)/i);
          if (bidMatches) {
            currentBid = bidMatches[1];
          } else {
            // Look for standalone price
            const priceMatches = containerText.match(/\$[\d,]+/g);
            if (priceMatches && priceMatches.length > 0) {
              // Try to find which one is the bid
              currentBid = priceMatches[0];
            }
          }
          
          // Extract Buy It Now price
          let buyNowPrice = '';
          const binMatches = containerText.match(/(?:Buy\s*(?:It\s*)?Now|BIN)[:\s]*(\$[\d,]+)/i);
          if (binMatches) {
            buyNowPrice = binMatches[1];
          }
          
          // Extract location from URL or text
          let location = '';
          const locMatch = href.match(/[-\/]([a-z]{2})-([a-z-]+)$/i);
          if (locMatch) {
            location = locMatch[1].toUpperCase() + ' - ' + locMatch[2].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          }
          
          // Create vehicle object
          const vehicle = {
            name: name,
            lotNumber: lotNumber,
            link: fullLink,
            imageUrl: imageUrl,
            odometer: odometer,
            estimatedRetailValue: estimatedValue,
            currentBid: currentBid,
            buyItNowPrice: buyNowPrice,
            location: location
          };
          
          results.push(vehicle);
          
        } catch (error) {
          console.error('Error parsing vehicle:', error.message);
        }
      });
      
      return results;
        });

        console.log(`\n✅ Found ${pageVehicles.length} vehicles on page ${currentPage}, attempt ${attempt}!\n`);
        
        // If no vehicles found and we have more attempts, wait before retrying
        if (pageVehicles.length === 0 && attempt < maxAttempts) {
          console.log(`⚠️  No vehicles found. Waiting 5 seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      } // End of attempt loop
      
      // Add page vehicles to total
      allVehicles = allVehicles.concat(pageVehicles);
      console.log(`📊 Total vehicles so far: ${allVehicles.length}`);
      
      // If no vehicles found after all attempts, we've reached the end
      if (pageVehicles.length === 0) {
        console.log(`⚠️  No vehicles found on page ${currentPage} after ${maxAttempts} attempts. Stopping pagination.`);
        break;
      }
      
      // Move to next page
      currentPage++;
      
      // Click next page button if not on last page
      if (currentPage <= maxPages) {
        console.log('⏳ Waiting 3 seconds before next page...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        try {
          console.log(`🔍 Looking for page ${currentPage} button...`);
          
          // Try to click the specific page number button
          // The page numbers have aria-label with just the number (e.g., aria-label="2")
          const pageNumberSelector = `button[aria-label="${currentPage}"].p-paginator-page`;
          
          const pageButton = await page.$(pageNumberSelector);
          
          if (pageButton) {
            const isDisabled = await page.evaluate(el => {
              return el.disabled || el.classList.contains('p-disabled') || el.classList.contains('disabled');
            }, pageButton);
            
            if (!isDisabled) {
              console.log(`✅ Found page ${currentPage} button`);
              await pageButton.click();
              console.log(`✅ Clicked page ${currentPage} button`);
              
              // Wait for navigation and content to load
              await new Promise(resolve => setTimeout(resolve, 5000));
              
              // Scroll to ensure content is loaded
              await page.evaluate(() => {
                window.scrollTo(0, 500);
              });
              await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
              console.log(`⚠️  Page ${currentPage} button is disabled`);
            }
          } else {
            // Fallback: Try clicking "Next Page" button
            console.log('⚠️  Page number button not found, trying "Next Page" button...');
            const nextButtonSelector = 'button[aria-label="Next Page"].p-paginator-next';
            const nextButton = await page.$(nextButtonSelector);
            
            if (nextButton) {
              const isDisabled = await page.evaluate(el => {
                return el.disabled || el.classList.contains('p-disabled') || el.classList.contains('disabled');
              }, nextButton);
              
              if (!isDisabled) {
                console.log('✅ Found "Next Page" button');
                await nextButton.click();
                console.log('✅ Clicked "Next Page" button');
                await new Promise(resolve => setTimeout(resolve, 5000));
              } else {
                console.log('⚠️  "Next Page" button is disabled');
              }
            } else {
              console.log('⚠️  Could not find pagination buttons');
            }
          }
        } catch (error) {
          console.log(`⚠️  Error navigating to page ${currentPage}: ${error.message}`);
        }
      }
    } // End of page loop

    const vehicleList = allVehicles;
    
    // Final result message
    if (vehicleList.length === 0) {
      console.log(`\n❌ Failed to extract vehicles from any page.`);
      console.log(`Check debug-screenshot-page*.png files to see what the pages looked like.`);
    } else {
      console.log(`\n✨ Successfully extracted ${vehicleList.length} vehicles from ${maxPages} page${maxPages > 1 ? 's' : ''}!\n`);
    }
    
    if (vehicleList.length > 0) {
      // Display first 5 vehicles
      vehicleList.slice(0, 5).forEach((car, index) => {
        console.log(`\n🚗 Vehicle ${index + 1}:`);
        console.log(`   Name: ${car.name}`);
        console.log(`   Lot #: ${car.lotNumber}`);
        console.log(`   Link: ${car.link}`);
        if (car.imageUrl) console.log(`   Image: ${car.imageUrl.substring(0, 80)}...`);
        if (car.odometer) console.log(`   Odometer: ${car.odometer}`);
        if (car.estimatedRetailValue) console.log(`   Est. Retail Value: ${car.estimatedRetailValue}`);
        if (car.currentBid) console.log(`   Current Bid: ${car.currentBid}`);
        if (car.buyItNowPrice) console.log(`   Buy It Now: ${car.buyItNowPrice}`);
        if (car.location) console.log(`   Location: ${car.location}`);
      });

      if (vehicleList.length > 5) {
        console.log(`\n... and ${vehicleList.length - 5} more vehicles`);
      }
      
      // Save to JSON
      await fs.writeFile('vehicles.json', JSON.stringify(vehicleList, null, 2));
      console.log('\n💾 Full data saved to vehicles.json');
      
      // Save to MongoDB database
      try {
        await saveVehicles(vehicleList);
        
        // Get database statistics
        const dbStats = await getVehicleStats();
        console.log('\n📊 Database Statistics:');
        console.log(`   Total vehicles in database: ${dbStats.totalVehicles || 0}`);
        console.log(`   Average odometer: ${Math.round(dbStats.avgOdometer || 0).toLocaleString()} mi`);
        console.log(`   Average bid: $${Math.round(dbStats.avgBid || 0).toLocaleString()}`);
        console.log(`   Bid range: $${Math.round(dbStats.minBid || 0).toLocaleString()} - $${Math.round(dbStats.maxBid || 0).toLocaleString()}`);
        console.log(`   Vehicles with Buy It Now: ${dbStats.vehiclesWithBuyNow || 0}`);
        if (dbStats.latestScrape) {
          console.log(`   Latest scrape: ${new Date(dbStats.latestScrape).toLocaleString()}`);
        }
      } catch (dbError) {
        console.error('⚠️  Database save failed, but JSON file was saved:', dbError.message);
      }
      
      // Create local statistics
      const stats = {
        totalVehicles: vehicleList.length,
        vehiclesWithImages: vehicleList.filter(v => v.imageUrl).length,
        vehiclesWithOdometer: vehicleList.filter(v => v.odometer).length,
        vehiclesWithEstValue: vehicleList.filter(v => v.estimatedRetailValue).length,
        vehiclesWithBid: vehicleList.filter(v => v.currentBid).length,
        vehiclesWithBuyNow: vehicleList.filter(v => v.buyItNowPrice).length,
        vehiclesWithLocation: vehicleList.filter(v => v.location).length,
        scrapedAt: new Date().toISOString()
      };
      
      await fs.writeFile('scrape-stats.json', JSON.stringify(stats, null, 2));
      
      console.log('\n📈 Local Scrape Statistics:');
      console.log(`   Total vehicles: ${stats.totalVehicles}`);
      console.log(`   With images: ${stats.vehiclesWithImages}`);
      console.log(`   With odometer: ${stats.vehiclesWithOdometer}`);
      console.log(`   With estimated value: ${stats.vehiclesWithEstValue}`);
      console.log(`   With current bid: ${stats.vehiclesWithBid}`);
      console.log(`   With buy now price: ${stats.vehiclesWithBuyNow}`);
      console.log(`   With location: ${stats.vehiclesWithLocation}`);
    }

    // Keep browser open for inspection
    console.log('\n⏳ Keeping browser open for 10 seconds for inspection...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    return vehicleList || [];

  } catch (error) {
    console.error('❌ Error scraping Copart:', error.message);
    throw error;
  } finally {
    await browser.close();
    console.log('\n🏁 Browser closed');
    
    // Close database connection
    try {
      await closeConnection();
    } catch (dbError) {
      console.log('ℹ️  Database connection cleanup completed');
    }
  }
}

// Run the scraper
scrapeCopartVehicles()
  .then(vehicles => {
    console.log(`\n✅ Scraping complete! Found ${vehicles.length} vehicles`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
