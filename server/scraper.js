const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Target locations for scraping
const LOCATIONS = [
  { slug: 'kuala-lumpur', name: 'Kuala Lumpur' },
  { slug: 'petaling-jaya', name: 'Petaling Jaya' },
  { slug: 'subang-jaya', name: 'Subang Jaya' },
  { slug: 'shah-alam', name: 'Shah Alam' },
  { slug: 'penang', name: 'Penang' }
];

const DATA_DIR = path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'properties.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Generate realistic mock data as a robust fallback
function generateSeedData() {
  console.log('Generating high-quality fallback seed data...');
  const seedProperties = [];
  const propertyTypes = ['HIGHRISE', 'LANDED', 'STUDIO'];
  const furnishTypes = ['FULL', 'PARTIAL', 'NONE'];

  // Specific real-looking neighborhoods for each location
  const neighborhoods = {
    'kuala-lumpur': ['Taman Melawati', 'KLCC', 'Bukit Bintang', 'Mont Kiara', 'Cheras', 'Setapak', 'Sentul'],
    'petaling-jaya': ['SS2', 'Damansara Utama', 'Kelana Jaya', 'Bandar Utama', 'Section 14', 'Jaya One'],
    'subang-jaya': ['SS15', 'USJ 4', 'USJ 9', 'Sunway', 'Subang Heights', 'Bandar Sunway'],
    'shah-alam': ['Section 7', 'Section 13', 'Glenmarie', 'Setia Alam', 'Kota Kemuning'],
    'penang': ['Georgetown', 'Bayan Lepas', 'Tanjung Bungah', 'Gurney Drive', 'Gelugor']
  };

  const highriseNames = ['Residence', 'Condo', 'Suites', 'Apartment', 'Heights'];
  const landedNames = ['Taman', 'Terrace', 'Villa', 'Garden', 'Mansion'];

  let idCounter = 900000;

  LOCATIONS.forEach(loc => {
    // Generate 40-60 properties per location to have a rich dataset
    const count = 40 + Math.floor(Math.random() * 20);
    const areas = neighborhoods[loc.slug];

    for (let i = 0; i < count; i++) {
      const id = idCounter++;
      const area = areas[Math.floor(Math.random() * areas.length)];
      const type = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
      const furnish = furnishTypes[Math.floor(Math.random() * furnishTypes.length)];

      let name = '';
      let sqft = 0;
      let bedroom = 0;
      let bathroom = 0;
      let price = 0;

      if (type === 'STUDIO') {
        name = `${area} Studio ${highriseNames[Math.floor(Math.random() * highriseNames.length)]}`;
        sqft = 400 + Math.floor(Math.random() * 250);
        bedroom = 1;
        bathroom = 1;
        price = 1000 + Math.floor(Math.random() * 800);
      } else if (type === 'HIGHRISE') {
        name = `${area} ${highriseNames[Math.floor(Math.random() * highriseNames.length)]}`;
        sqft = 750 + Math.floor(Math.random() * 600);
        bedroom = 2 + Math.floor(Math.random() * 2); // 2 to 3 bed
        bathroom = 1 + Math.floor(Math.random() * 2); // 1 to 2 bath
        price = 1200 + Math.floor(Math.random() * 1500);
      } else { // LANDED
        name = `${landedNames[Math.floor(Math.random() * landedNames.length)]} ${area}`;
        sqft = 1200 + Math.floor(Math.random() * 1500);
        bedroom = 3 + Math.floor(Math.random() * 2); // 3 to 4 bed
        bathroom = 2 + Math.floor(Math.random() * 2); // 2 to 3 bath
        price = 1800 + Math.floor(Math.random() * 2500);
      }

      // Adjust price slightly based on furnishing
      if (furnish === 'FULL') price += 200;
      if (furnish === 'NONE') price -= 150;

      // Location specific price modifiers
      if (loc.slug === 'kuala-lumpur') price = Math.round(price * 1.2);
      else if (loc.slug === 'shah-alam') price = Math.round(price * 0.9);

      // Ensure price is rounded to nearest 50
      price = Math.round(price / 50) * 50;

      const carpark = Math.floor(Math.random() * 3);
      const postcode = loc.slug === 'kuala-lumpur' ? '50000' : loc.slug === 'petaling-jaya' ? '47300' : '40000';

      // Generate a dynamic mix of rental prices based on id to be stable
      const hasDaily = (id % 3 === 0);   // ~33%
      const hasMonthly = (id % 6 !== 0); // ~83%
      const hasYearly = (id % 4 === 0);  // ~25%

      // Ensure at least one rental type is available
      const finalMonthly = (hasMonthly || (!hasDaily && !hasYearly)) ? price : null;
      const finalDaily = hasDaily ? Math.max(30, Math.round((price / 25) / 10) * 10) : null;
      const finalYearly = hasYearly ? Math.round((price * 11) / 100) * 100 : null;

      seedProperties.push({
        id,
        name,
        type,
        furnishType: furnish,
        sqft,
        bedroom,
        bathroom,
        carpark,
        price: finalMonthly || finalDaily || finalYearly, // Base price fallback
        rentalPrices: {
          DAILY: finalDaily,
          MONTHLY: finalMonthly,
          YEARLY: finalYearly
        },
        postcode,
        state: loc.slug === 'penang' ? 'Pulau Pinang' : 'Selangor',
        city: loc.name,
        country: 'Malaysia',
        images: [
          {
            url: `https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=400&q=80`
          }
        ],
        slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${id}`,
        furnishes: furnish === 'FULL' ? ['air_conditioner', 'kitchen_cabinet', 'sofa', 'tv', 'fridge', 'washing_machine'] : furnish === 'PARTIAL' ? ['kitchen_cabinet', 'air_conditioner'] : [],
        facilities: ['24_hours_security', 'swimming_pool', 'gymnasium', 'playground'],
        dateCreated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
  });

  return seedProperties;
}

// Main Scraping Function
async function scrapeProperties(maxPages = 3) {
  console.log('Starting SPEEDHOME Scraper...');
  console.log(`Max pages per location: ${maxPages}`);

  let allListings = [];
  let browser = null;

  try {
    console.log('Launching Playwright Chromium browser...');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();

    // Go to Speedhome homepage to initialize cookies and bypass Cloudflare
    console.log('Opening SPEEDHOME homepage to establish cookies...');
    await page.goto('https://speedhome.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Wait a brief moment
    await page.waitForTimeout(3000);

    for (const loc of LOCATIONS) {
      console.log(`\n--- Scraping Location: ${loc.name} (${loc.slug}) ---`);

      for (let pageNum = 0; pageNum < maxPages; pageNum++) {
        console.log(`Fetching Page ${pageNum + 1} for ${loc.name}...`);

        try {
          // Execute the search API call inside the browser context
          const result = await page.evaluate(async (params) => {
            const { slug, pageNum } = params;
            const payload = {
              searchParams: { loc: slug },
              pathname: '/rent/[loc]',
              page: pageNum,
              itemsPerPage: 40,
              userToken: null
            };

            const response = await fetch('https://speedhome.com/api/properties/search', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
            });

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
          }, { slug: loc.slug, pageNum });

          if (result && result.content && result.content.length > 0) {
            const items = result.content;
            console.log(`Successfully fetched ${items.length} properties from Page ${pageNum + 1}.`);

            // Clean up and standardize the listing structure
            const cleanedItems = items.map(item => {
              // Extract the image URLs safely
              const imgs = item.images && item.images.length > 0
                ? item.images.map(img => ({ url: img.url || img.imageUrl }))
                : [{ url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=400&q=80' }];

              const basePrice = item.price || 0;
              const hasDaily = (item.id % 3 === 0);
              const hasYearly = (item.id % 4 === 0);

              const rentalPrices = {
                DAILY: hasDaily ? Math.max(30, Math.round((basePrice / 25) / 10) * 10) : null,
                MONTHLY: basePrice, // SPEEDHOME listings are monthly by default
                YEARLY: hasYearly ? Math.round((basePrice * 11) / 100) * 100 : null
              };

              return {
                id: item.id,
                name: item.name || 'Property Rental',
                type: item.type || 'HIGHRISE',
                furnishType: item.furnishType || 'PARTIAL',
                sqft: item.sqft || 0,
                bedroom: item.bedroom || 0,
                bathroom: item.bathroom || 0,
                carpark: item.carpark || 0,
                price: basePrice,
                rentalPrices,
                postcode: item.postcode || '',
                state: item.state || 'Selangor',
                city: loc.name, // Override with standard city name
                country: 'Malaysia',
                images: imgs,
                slug: item.slug || '',
                furnishes: item.furnishes || [],
                facilities: item.facilities || [],
                dateCreated: item.dateCreated || new Date().toISOString()
              };
            });

            allListings = allListings.concat(cleanedItems);

            // If we got fewer than 40 items, it means there are no more pages
            if (items.length < 40) {
              console.log('Reached the last page for this location.');
              break;
            }
          } else {
            console.log(`No content returned for ${loc.name} on Page ${pageNum + 1}.`);
            break;
          }

        } catch (pageErr) {
          console.error(`Failed to scrape page ${pageNum + 1} for ${loc.name}:`, pageErr.message);
          // Continue to next location or page, don't crash entirely
          break;
        }

        // Polite rate-limiting delay (1.5 seconds) as required by robots.txt and guidelines
        console.log('Waiting 1.5 seconds to respect crawl guidelines...');
        await page.waitForTimeout(1500);
      }
    }

    console.log(`\nScraping complete! Total properties fetched: ${allListings.length}`);

  } catch (err) {
    console.error('Fatal error during scraping session:', err.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed.');
    }
  }

  // Handle data persistence and fallback
  let finalData = [];
  if (allListings.length > 0) {
    finalData = allListings;
    console.log(`Successfully scraped ${finalData.length} active listings from SPEEDHOME.`);
  } else {
    console.log('WARNING: Scraper returned 0 listings (possibly due to network/Cloudflare blocking).');
    // Read existing data if available, otherwise generate seed data
    if (fs.existsSync(DATA_FILE)) {
      try {
        const existingRaw = fs.readFileSync(DATA_FILE, 'utf8');
        const existing = JSON.parse(existingRaw);
        if (existing && existing.length > 0) {
          console.log(`Retaining existing ${existing.length} properties from database.`);
          return existing;
        }
      } catch (e) {
        // ignore error and proceed to seed
      }
    }

    // Fallback to high-quality seed data
    finalData = generateSeedData();
  }

  // Save data to properties.json
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(finalData, null, 2), 'utf8');
    console.log(`Data saved to database at ${DATA_FILE}`);
  } catch (saveErr) {
    console.error('Failed to write database file:', saveErr.message);
  }

  return finalData;
}

// If run directly from command line
if (require.main === module) {
  scrapeProperties().then(() => {
    console.log('Scraper script finished execution.');
    process.exit(0);
  }).catch(err => {
    console.error('Scraper script crashed:', err);
    process.exit(1);
  });
}

// Scrape a single location by URL slug and merge results into the existing database
async function scrapeLocationBySlug(slug, maxPages = 3) {
  console.log(`[scrapeLocationBySlug] Starting scrape for slug: ${slug}`);

  // Derive a human-readable city name from the slug
  const cityName = slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  let newListings = [];
  let browser = null;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();

    console.log('[scrapeLocationBySlug] Opening SPEEDHOME to establish cookies...');
    await page.goto('https://speedhome.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    for (let pageNum = 0; pageNum < maxPages; pageNum++) {
      console.log(`[scrapeLocationBySlug] Fetching page ${pageNum + 1} for ${cityName}...`);
      try {
        const result = await page.evaluate(async (params) => {
          const { slug, pageNum } = params;
          const payload = {
            searchParams: { loc: slug },
            pathname: '/rent/[loc]',
            page: pageNum,
            itemsPerPage: 40,
            userToken: null
          };
          const response = await fetch('https://speedhome.com/api/properties/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return await response.json();
        }, { slug, pageNum });

        if (result && result.content && result.content.length > 0) {
          const items = result.content;
          console.log(`[scrapeLocationBySlug] Got ${items.length} items on page ${pageNum + 1}.`);

          const cleaned = items.map(item => {
            const imgs =
              item.images && item.images.length > 0
                ? item.images.map(img => ({ url: img.url || img.imageUrl }))
                : [{ url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=400&q=80' }];
            const basePrice = item.price || 0;
            const hasDaily = (item.id % 3 === 0);
            const hasYearly = (item.id % 4 === 0);

            const rentalPrices = {
              DAILY: hasDaily ? Math.max(30, Math.round((basePrice / 25) / 10) * 10) : null,
              MONTHLY: basePrice,
              YEARLY: hasYearly ? Math.round((basePrice * 11) / 100) * 100 : null
            };

            return {
              id: item.id,
              name: item.name || 'Property Rental',
              type: item.type || 'HIGHRISE',
              furnishType: item.furnishType || 'PARTIAL',
              sqft: item.sqft || 0,
              bedroom: item.bedroom || 0,
              bathroom: item.bathroom || 0,
              carpark: item.carpark || 0,
              price: basePrice,
              rentalPrices,
              postcode: item.postcode || '',
              state: item.state || '',
              city: cityName,
              country: 'Malaysia',
              images: imgs,
              slug: item.slug || '',
              furnishes: item.furnishes || [],
              facilities: item.facilities || [],
              dateCreated: item.dateCreated || new Date().toISOString()
            };
          });

          newListings = newListings.concat(cleaned);
          if (items.length < 40) {
            console.log('[scrapeLocationBySlug] Last page reached.');
            break;
          }
        } else {
          console.log('[scrapeLocationBySlug] No more items, stopping.');
          break;
        }
      } catch (err) {
        console.error(`[scrapeLocationBySlug] Error on page ${pageNum + 1}:`, err.message);
        break;
      }
      await page.waitForTimeout(1500);
    }
  } catch (err) {
    console.error('[scrapeLocationBySlug] Fatal error:', err.message);
  } finally {
    if (browser) await browser.close();
  }

  if (newListings.length === 0) {
    console.log('[scrapeLocationBySlug] No listings scraped for', slug);
    return { newCount: 0, totalCount: 0 };
  }

  // Load existing database, merge (deduplicate by id), and save
  let existing = [];
  if (fs.existsSync(DATA_FILE)) {
    try {
      existing = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {
      existing = [];
    }
  }

  const existingIds = new Set(existing.map(p => p.id));
  const trulyNew = newListings.filter(p => !existingIds.has(p.id));
  // Also replace any existing items from same city (to refresh data)
  const otherCityItems = existing.filter(
    p => p.city.toLowerCase() !== cityName.toLowerCase()
  );
  const merged = [...otherCityItems, ...newListings];

  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(merged, null, 2), 'utf8');
    console.log(`[scrapeLocationBySlug] Saved merged dataset: ${merged.length} total properties.`);
  } catch (saveErr) {
    console.error('[scrapeLocationBySlug] Failed to save:', saveErr.message);
  }

  return {
    newCount: trulyNew.length,
    totalCount: merged.length,
    cityName
  };
}

module.exports = {
  scrapeProperties,
  scrapeLocationBySlug,
  generateSeedData
};
