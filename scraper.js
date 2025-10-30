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
    headless: true, // Set to true for background operation
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
    const maxPages = 10; // Copart has 10 pages total (1000 vehicles / 100 per page)
    const maxAttempts = 3;
    
    while (currentPage <= maxPages) {
      console.log(`\n📄 Scraping Page ${currentPage}/${maxPages}...`);
      
      let pageVehicles = [];
      let attempt = 0;
      let paginationInfo = null; // Store pagination info for page change detection
      
      while (pageVehicles.length === 0 && attempt < maxAttempts) {
        attempt++;
        
        if (attempt > 1) {
          console.log(`🔄 Attempt ${attempt}/${maxAttempts}: Reloading page...`);
        } else if (currentPage === 1) {
          console.log('📡 Navigating to Copart...');
        }
        
        // Navigate to the page (only on first page)
        if (currentPage === 1) {
          console.log(`🌐 Navigating to: ${COPART_URL}`);
          await page.goto(COPART_URL, { 
            waitUntil: 'domcontentloaded',
            timeout: 60000 
          });
        }
        // For other pages, we rely on button clicks - no URL navigation

        // Wait for content to load
        console.log('⏳ Waiting for content to load (10 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Debug: Show current URL and page info
        const currentUrl = await page.url();
        console.log(`🔍 Current URL: ${currentUrl}`);
        
        // Check if we're actually on a different page by looking for pagination info at bottom
        paginationInfo = await page.evaluate(() => {
          // Look for pagination info like "Showing 1 to 100 of 1000 entries"
          const paginationText = document.querySelector('.p-paginator-current');
          const activePage = document.querySelector('.p-paginator-page.p-highlight');
          
          return {
            paginationText: paginationText ? paginationText.textContent : 'No pagination text found',
            activePage: activePage ? activePage.textContent : 'No active page found',
            showingInfo: document.body.innerText.match(/Showing \d+ to \d+ of \d+ entries/i) || 'No showing info found'
          };
        });
        console.log(`📄 Pagination info: ${paginationInfo.paginationText}`);
        console.log(`📄 Active page: ${paginationInfo.activePage}`);
        console.log(`📄 Showing info: ${paginationInfo.showingInfo}`);
        
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
        
        // Take screenshot (disabled for background operation to prevent browser issues)
        // try {
        //   await page.screenshot({ path: `debug-screenshot-page${currentPage}-attempt${attempt}.png`, fullPage: true });
        //   console.log(`📸 Screenshot saved (page ${currentPage}, attempt ${attempt})`);
        // } catch (screenshotError) {
        //   console.log(`⚠️  Screenshot failed: ${screenshotError.message}`);
        // }

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
        
        // Show first few vehicles for debugging
        if (pageVehicles.length > 0) {
          console.log(`   Sample vehicles from page ${currentPage}:`);
          pageVehicles.slice(0, 3).forEach((vehicle, index) => {
            console.log(`   ${index + 1}. ${vehicle.name} - Lot: ${vehicle.lotNumber}`);
          });
          
          // Check if we're getting the same vehicles as previous pages
          if (currentPage > 1) {
            const firstVehicle = pageVehicles[0];
            const isSameAsFirst = allVehicles.some(v => v.lotNumber === firstVehicle.lotNumber);
            if (isSameAsFirst) {
              console.log(`   ⚠️  First vehicle on page ${currentPage} was already seen before!`);
            } else {
              console.log(`   ✅ First vehicle on page ${currentPage} is new!`);
            }
          }
        }
        
        // If no vehicles found and we have more attempts, wait before retrying
        if (pageVehicles.length === 0 && attempt < maxAttempts) {
          console.log(`⚠️  No vehicles found. Waiting 5 seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      } // End of attempt loop
      
      // Check for duplicates by lotNumber before adding
      const existingLotNumbers = allVehicles.map(v => v.lotNumber);
      const newVehicles = pageVehicles.filter(vehicle => !existingLotNumbers.includes(vehicle.lotNumber));
      const duplicates = pageVehicles.length - newVehicles.length;
      
      if (duplicates > 0) {
        console.log(`⚠️  Found ${duplicates} duplicate vehicles on page ${currentPage} (by lotNumber)`);
        console.log(`   New vehicles: ${newVehicles.length}, Duplicates: ${duplicates}`);
        
        // Don't stop on duplicates - let's see all pages to understand the issue
        // if (duplicates > pageVehicles.length * 0.8) { // 80% duplicates
        //   console.log(`🛑 Too many duplicates (${Math.round(duplicates/pageVehicles.length*100)}%). Stopping pagination.`);
        //   break;
        // }
      }
      
      // Add only new vehicles to total
      allVehicles = allVehicles.concat(newVehicles);
      console.log(`📊 Total vehicles so far: ${allVehicles.length} (${newVehicles.length} new from page ${currentPage})`);
      
      // Save vehicles to database after each page (only if we have new vehicles)
      if (newVehicles.length > 0) {
        try {
          console.log(`💾 Saving ${newVehicles.length} new vehicles from page ${currentPage} to database...`);
          await saveVehicles(newVehicles);
          console.log(`✅ Successfully saved ${newVehicles.length} vehicles from page ${currentPage}`);
        } catch (dbError) {
          console.error(`⚠️  Failed to save vehicles from page ${currentPage}:`, dbError.message);
        }
      } else {
        console.log(`ℹ️  No new vehicles to save from page ${currentPage}`);
      }
      
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
              
              // Check if page actually changed by looking at pagination info
              const newPaginationInfo = await page.evaluate(() => {
                const paginationText = document.querySelector('.p-paginator-current');
                const activePage = document.querySelector('.p-paginator-page.p-highlight');
                return {
                  paginationText: paginationText ? paginationText.textContent : 'No pagination text found',
                  activePage: activePage ? activePage.textContent : 'No active page found'
                };
              });
              
              console.log(`🔍 After click - Pagination info: ${newPaginationInfo.paginationText}`);
              console.log(`🔍 After click - Active page: ${newPaginationInfo.activePage}`);
              
               // Check if we're actually on a different page
               if (newPaginationInfo.activePage === paginationInfo.activePage) {
                 console.log(`⚠️  Page didn't change after clicking! Still on page ${paginationInfo.activePage}`);
                 
                 // Try clicking again with a longer wait
                 console.log(`🔄 Retrying page ${currentPage} click...`);
                 await new Promise(resolve => setTimeout(resolve, 2000));
                 
                 // Try clicking the page button again
                 const retryPageButton = await page.$(pageNumberSelector);
                 if (retryPageButton) {
                   await retryPageButton.click();
                   console.log(`🔄 Retry clicked page ${currentPage} button`);
                   
                   // Wait longer for the page to load
                   await new Promise(resolve => setTimeout(resolve, 5000));
                   
                   // Check if page changed after retry
                   const retryPaginationInfo = await page.evaluate(() => {
                     const paginationText = document.querySelector('.p-paginator-current');
                     const activePage = document.querySelector('.p-paginator-page.p-highlight');
                     return {
                       paginationText: paginationText ? paginationText.textContent : 'No pagination text found',
                       activePage: activePage ? activePage.textContent : 'No active page found'
                     };
                   });
                   
                   console.log(`🔍 After retry - Pagination info: ${retryPaginationInfo.paginationText}`);
                   console.log(`🔍 After retry - Active page: ${retryPaginationInfo.activePage}`);
                   
                   if (retryPaginationInfo.activePage === paginationInfo.activePage) {
                     console.log(`❌ Page still didn't change after retry. Stopping pagination.`);
                     currentPage = maxPages + 1; // Force exit from while loop
                     break;
                   } else {
                     console.log(`✅ Page changed after retry from ${paginationInfo.activePage} to ${retryPaginationInfo.activePage}`);
                   }
                 } else {
                   console.log(`❌ Could not find page button for retry. Stopping pagination.`);
                   currentPage = maxPages + 1; // Force exit from while loop
                   break;
                 }
               } else {
                 console.log(`✅ Page successfully changed from ${paginationInfo.activePage} to ${newPaginationInfo.activePage}`);
               }
              
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
                
                // Wait for navigation and content to load
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                // Check if page actually changed by looking at pagination info
                const newPaginationInfo = await page.evaluate(() => {
                  const paginationText = document.querySelector('.p-paginator-current');
                  const activePage = document.querySelector('.p-paginator-page.p-highlight');
                  return {
                    paginationText: paginationText ? paginationText.textContent : 'No pagination text found',
                    activePage: activePage ? activePage.textContent : 'No active page found'
                  };
                });
                
                console.log(`🔍 After Next click - Pagination info: ${newPaginationInfo.paginationText}`);
                console.log(`🔍 After Next click - Active page: ${newPaginationInfo.activePage}`);
                
                 // Check if we're actually on a different page
                 if (newPaginationInfo.activePage === paginationInfo.activePage) {
                   console.log(`⚠️  Page didn't change after clicking Next! Still on page ${paginationInfo.activePage}`);
                   
                   // Try clicking Next button again
                   console.log(`🔄 Retrying Next Page click...`);
                   await new Promise(resolve => setTimeout(resolve, 2000));
                   
                   const retryNextButton = await page.$(nextButtonSelector);
                   if (retryNextButton) {
                     await retryNextButton.click();
                     console.log(`🔄 Retry clicked Next Page button`);
                     
                     // Wait longer for the page to load
                     await new Promise(resolve => setTimeout(resolve, 5000));
                     
                     // Check if page changed after retry
                     const retryPaginationInfo = await page.evaluate(() => {
                       const paginationText = document.querySelector('.p-paginator-current');
                       const activePage = document.querySelector('.p-paginator-page.p-highlight');
                       return {
                         paginationText: paginationText ? paginationText.textContent : 'No pagination text found',
                         activePage: activePage ? activePage.textContent : 'No active page found'
                       };
                     });
                     
                     console.log(`🔍 After Next retry - Pagination info: ${retryPaginationInfo.paginationText}`);
                     console.log(`🔍 After Next retry - Active page: ${retryPaginationInfo.activePage}`);
                     
                     if (retryPaginationInfo.activePage === paginationInfo.activePage) {
                       console.log(`❌ Page still didn't change after Next retry. Stopping pagination.`);
                       currentPage = maxPages + 1; // Force exit from while loop
                       break;
                     } else {
                       console.log(`✅ Page changed after Next retry from ${paginationInfo.activePage} to ${retryPaginationInfo.activePage}`);
                     }
                   } else {
                     console.log(`❌ Could not find Next button for retry. Stopping pagination.`);
                     currentPage = maxPages + 1; // Force exit from while loop
                     break;
                   }
                 } else {
                   console.log(`✅ Page successfully changed from ${paginationInfo.activePage} to ${newPaginationInfo.activePage}`);
                 }
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
      
      // Get final database statistics (vehicles were saved after each page)
      try {
        const dbStats = await getVehicleStats();
        console.log('\n📊 Final Database Statistics:');
        console.log(`   Total vehicles in database: ${dbStats.totalVehicles || 0}`);
        console.log(`   Average odometer: ${Math.round(dbStats.avgOdometer || 0).toLocaleString()} mi`);
        console.log(`   Average bid: $${Math.round(dbStats.avgBid || 0).toLocaleString()}`);
        console.log(`   Bid range: $${Math.round(dbStats.minBid || 0).toLocaleString()} - $${Math.round(dbStats.maxBid || 0).toLocaleString()}`);
        console.log(`   Vehicles with Buy It Now: ${dbStats.vehiclesWithBuyNow || 0}`);
        if (dbStats.latestScrape) {
          console.log(`   Latest scrape: ${new Date(dbStats.latestScrape).toLocaleString()}`);
        }
      } catch (dbError) {
        console.error('⚠️  Failed to get database statistics:', dbError.message);
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

    // Keep browser open for inspection (disabled for background operation)
    // console.log('\n⏳ Keeping browser open for 10 seconds for inspection...');
    // await new Promise(resolve => setTimeout(resolve, 10000));

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
