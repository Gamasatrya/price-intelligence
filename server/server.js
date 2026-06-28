const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { scrapeProperties, scrapeLocationBySlug } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 5001;
const DATA_FILE = path.join(__dirname, '../data/properties.json');

app.use(cors());
app.use(express.json());

// Request logging and cache control middleware for debugging
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});


// Global state to track scraper status
let isScraping = false;
let scraperProgress = {
  status: 'idle',
  message: 'Scraper is idle',
  progress: 0
};

// Helper function to load properties
function loadProperties() {
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading properties database:', err.message);
    return [];
  }
}

// Helper: get price period label from rental type
function getPricePeriodLabel(rentalType) {
  switch ((rentalType || 'MONTHLY').toUpperCase()) {
    case 'DAILY': return '/day';
    case 'YEARLY': return '/year';
    default: return '/month';
  }
}

// Data migration: ensure all records have a rentalPrices object
function migrateRentalPrices() {
  if (!fs.existsSync(DATA_FILE)) return;
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);
    const needsMigration = data.some(p => !p.rentalPrices);
    if (!needsMigration) return;

    console.log('[Migration] Migrating properties to multi-price structure...');
    const migrated = data.map(p => {
      if (p.rentalPrices) return p;

      // Base values from current rentalType and price
      const currentType = (p.rentalType || 'MONTHLY').toUpperCase();
      const currentPrice = p.price || 1000;

      const prices = {
        DAILY: null,
        MONTHLY: null,
        YEARLY: null
      };

      prices[currentType] = currentPrice;

      const id = p.id || 0;
      let baseMonthly = currentPrice;
      if (currentType === 'DAILY') {
        baseMonthly = currentPrice * 25;
      } else if (currentType === 'YEARLY') {
        baseMonthly = Math.round(currentPrice / 12);
      }

      // Populate other prices dynamically based on stable ID hashing
      const hasDaily = (id % 3 === 0);
      const hasMonthly = (id % 6 !== 0);
      const hasYearly = (id % 4 === 0);

      const finalMonthly = (hasMonthly || (!hasDaily && !hasYearly)) ? baseMonthly : null;
      const finalDaily = hasDaily ? Math.max(30, Math.round((baseMonthly / 25) / 10) * 10) : null;
      const finalYearly = hasYearly ? Math.round((baseMonthly * 11) / 100) * 100 : null;

      prices.DAILY = currentType === 'DAILY' ? currentPrice : finalDaily;
      prices.MONTHLY = currentType === 'MONTHLY' ? currentPrice : finalMonthly;
      prices.YEARLY = currentType === 'YEARLY' ? currentPrice : finalYearly;

      return {
        ...p,
        price: prices.MONTHLY || prices.DAILY || prices.YEARLY, // Fallback price
        rentalPrices: prices
      };
    });

    fs.writeFileSync(DATA_FILE, JSON.stringify(migrated, null, 2), 'utf8');
    console.log(`[Migration] Migrated ${migrated.length} records to multi-price structure.`);
  } catch (err) {
    console.error('[Migration] Failed:', err.message);
  }
}
migrateRentalPrices();

// Filter helper function
function getFilteredProperties(properties, query) {
  // Determine active rental type and its price period
  const activeRentalType = (query.rentalType || 'ALL').toUpperCase();
  const activePricePeriod = activeRentalType === 'ALL' ? 'MONTHLY' : activeRentalType;

  // Map each property's active price based on the selected rental type
  let filtered = properties.map(p => {
    // Fallback if rentalPrices is not populated yet
    const prices = p.rentalPrices || {
      DAILY: p.rentalType === 'DAILY' ? p.price : null,
      MONTHLY: p.rentalType === 'MONTHLY' || !p.rentalType ? p.price : null,
      YEARLY: p.rentalType === 'YEARLY' ? p.price : null
    };

    let activePrice = prices[activePricePeriod];
    let activeType = activePricePeriod;

    // Fallback to first available price if activePrice is not available (only when selected rental type is ALL)
    if (activeRentalType === 'ALL' && (activePrice === null || activePrice === undefined)) {
      if (prices.MONTHLY !== null && prices.MONTHLY !== undefined) {
        activePrice = prices.MONTHLY;
        activeType = 'MONTHLY';
      } else if (prices.YEARLY !== null && prices.YEARLY !== undefined) {
        activePrice = prices.YEARLY;
        activeType = 'YEARLY';
      } else if (prices.DAILY !== null && prices.DAILY !== undefined) {
        activePrice = prices.DAILY;
        activeType = 'DAILY';
      }
    }

    return {
      ...p,
      rentalPrices: prices,
      price: activePrice, // Override for sorting and statistics!
      rentalType: activeType // Override rentalType so the frontend shows the correct price suffix!
    };
  });

  // Filter out properties that don't have a price for the selected rental type (if a specific one is selected)
  if (activeRentalType !== 'ALL') {
    filtered = filtered.filter(p => p.price !== null && p.price !== undefined);
  }

  // Location filter
  if (query.city) {
    const cities = Array.isArray(query.city) ? query.city : [query.city];
    filtered = filtered.filter(p => cities.some(c => p.city.toLowerCase() === c.toLowerCase()));
  }

  // Property Type filter
  if (query.type) {
    const types = Array.isArray(query.type) ? query.type : [query.type];
    filtered = filtered.filter(p => types.some(t => p.type.toLowerCase() === t.toLowerCase()));
  }

  // Furnishing filter
  if (query.furnishType) {
    const furnishes = Array.isArray(query.furnishType) ? query.furnishType : [query.furnishType];
    filtered = filtered.filter(p => furnishes.some(f => p.furnishType.toLowerCase() === f.toLowerCase()));
  }

  // Price range filters (apply to the dynamically overridden active price!)
  if (query.minPrice) {
    filtered = filtered.filter(p => p.price >= parseInt(query.minPrice));
  }
  if (query.maxPrice) {
    filtered = filtered.filter(p => p.price <= parseInt(query.maxPrice));
  }

  // Sqft range filters
  if (query.minSqft) {
    filtered = filtered.filter(p => p.sqft >= parseInt(query.minSqft));
  }
  if (query.maxSqft) {
    filtered = filtered.filter(p => p.sqft <= parseInt(query.maxSqft));
  }

  // Bedroom / Bathroom filters
  if (query.bedroom) {
    const bedrooms = Array.isArray(query.bedroom) ? query.bedroom.map(Number) : [parseInt(query.bedroom)];
    filtered = filtered.filter(p => {
      if (bedrooms.includes(4)) {
        return p.bedroom >= 4 || bedrooms.includes(p.bedroom);
      }
      return bedrooms.includes(p.bedroom);
    });
  }
  if (query.bathroom) {
    const bathrooms = Array.isArray(query.bathroom) ? query.bathroom.map(Number) : [parseInt(query.bathroom)];
    filtered = filtered.filter(p => bathrooms.includes(p.bathroom));
  }

  // Search keyword filter (searches name and postcode)
  if (query.search) {
    const searchVal = query.search.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(searchVal) ||
      p.postcode.includes(searchVal)
    );
  }

  return filtered;
}

// Calculate median
function calculateMedian(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

// --- API ENDPOINTS ---

// 1. GET /api/properties: Get paginated and filtered properties list
app.get('/api/properties', (req, res) => {
  const properties = loadProperties();
  const filtered = getFilteredProperties(properties, req.query);

  // Sorting
  const sortBy = req.query.sortBy || 'dateCreated';
  const order = req.query.order || 'desc';

  filtered.sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];

    // Handle string date comparison
    if (sortBy === 'dateCreated') {
      valA = new Date(valA).getTime();
      valB = new Date(valB).getTime();
    }

    if (valA < valB) return order === 'asc' ? -1 : 1;
    if (valA > valB) return order === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const paginated = filtered.slice(startIndex, endIndex);

  res.json({
    total: filtered.length,
    page,
    limit,
    totalPages: Math.ceil(filtered.length / limit),
    data: paginated
  });
});

// Helper: get price period label from rental type
function getPricePeriodLabel(rentalType) {
  switch ((rentalType || 'MONTHLY').toUpperCase()) {
    case 'DAILY': return '/day';
    case 'YEARLY': return '/year';
    default: return '/month';
  }
}

// 2. GET /api/analytics: Get statistical analysis based on filtered data
app.get('/api/analytics', (req, res) => {
  const properties = loadProperties();

  // Compute which rental types actually have non-null prices in the database BEFORE filtering (for UI pill show/hide)
  const availableSet = new Set();
  properties.forEach(p => {
    const prices = p.rentalPrices || {
      DAILY: p.rentalType === 'DAILY' ? p.price : null,
      MONTHLY: p.rentalType === 'MONTHLY' || !p.rentalType ? p.price : null,
      YEARLY: p.rentalType === 'YEARLY' ? p.price : null
    };
    if (prices.DAILY !== null && prices.DAILY !== undefined) availableSet.add('DAILY');
    if (prices.MONTHLY !== null && prices.MONTHLY !== undefined) availableSet.add('MONTHLY');
    if (prices.YEARLY !== null && prices.YEARLY !== undefined) availableSet.add('YEARLY');
  });
  const availableRentalTypes = [...availableSet];
  // Determine active rental type and its price period label
  const activeRentalType = (req.query.rentalType || 'ALL').toUpperCase();
  const activePricePeriod = activeRentalType === 'ALL' ? 'MONTHLY' : activeRentalType;
  const activePricePeriodLabel = getPricePeriodLabel(activePricePeriod);

  // We compute statistics based on the filtered dataset to make the dashboard dynamic!
  const filtered = getFilteredProperties(properties, req.query);

  const totalCount = filtered.length;
  if (totalCount === 0) {
    return res.json({
      totalCount: 0,
      avgPrice: 0,
      medianPrice: 0,
      minPrice: 0,
      maxPrice: 0,
      avgPricePerSqft: 0,
      priceDistribution: [],
      priceByType: [],
      priceByLocation: [],
      priceVsSize: [],
      priceByRooms: [],
      availableRentalTypes,
      activePricePeriod,
      activePricePeriodLabel
    });
  }

  const prices = filtered.map(p => p.price);
  const sumPrice = prices.reduce((sum, p) => sum + p, 0);
  const avgPrice = Math.round(sumPrice / totalCount);
  const medianPrice = calculateMedian(prices);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  // Price per Sqft (filter out properties with 0 sqft to avoid division by zero)
  const validSqftProps = filtered.filter(p => p.sqft > 0);
  const avgPricePerSqft = validSqftProps.length > 0
    ? parseFloat((validSqftProps.reduce((sum, p) => sum + (p.price / p.sqft), 0) / validSqftProps.length).toFixed(2))
    : 0;

  // 1. Price Distribution Histogram (Buckets of RM250 or RM500 depending on range)
  // Let's create standard buckets: <1000, 1000-1250, 1250-1500, 1500-1750, 1750-2000, 2000-2500, 2500-3000, >3000
  const distributionBuckets = [
    { label: '< RM1000', min: 0, max: 999, count: 0 },
    { label: 'RM1000 - 1249', min: 1000, max: 1249, count: 0 },
    { label: 'RM1250 - 1499', min: 1250, max: 1499, count: 0 },
    { label: 'RM1500 - 1749', min: 1500, max: 1749, count: 0 },
    { label: 'RM1750 - 1999', min: 1750, max: 1999, count: 0 },
    { label: 'RM2000 - 2499', min: 2000, max: 2499, count: 0 },
    { label: 'RM2500 - 2999', min: 2500, max: 2999, count: 0 },
    { label: 'RM3000+', min: 3000, max: Infinity, count: 0 }
  ];

  prices.forEach(price => {
    for (const bucket of distributionBuckets) {
      if (price >= bucket.min && price <= bucket.max) {
        bucket.count++;
        break;
      }
    }
  });

  // 2. Price and Count by Property Type (HIGHRISE, LANDED, STUDIO)
  const typeGroups = {};
  filtered.forEach(p => {
    if (!typeGroups[p.type]) {
      typeGroups[p.type] = { sum: 0, count: 0 };
    }
    typeGroups[p.type].sum += p.price;
    typeGroups[p.type].count++;
  });
  const priceByType = Object.keys(typeGroups).map(type => ({
    type: type === 'HIGHRISE' ? 'High-Rise Condo' : type === 'LANDED' ? 'Landed House' : 'Studio',
    avgPrice: Math.round(typeGroups[type].sum / typeGroups[type].count),
    count: typeGroups[type].count
  }));

  // 3. Price and Count by Location (City)
  const locationGroups = {};
  filtered.forEach(p => {
    if (!locationGroups[p.city]) {
      locationGroups[p.city] = { sum: 0, count: 0 };
    }
    locationGroups[p.city].sum += p.price;
    locationGroups[p.city].count++;
  });
  const priceByLocation = Object.keys(locationGroups).map(city => ({
    city,
    avgPrice: Math.round(locationGroups[city].sum / locationGroups[city].count),
    count: locationGroups[city].count
  }));

  // 4. Price vs Size Scatter Plot (Limit to 200 points for frontend performance)
  const priceVsSize = filtered.slice(0, 200).map(p => ({
    name: p.name,
    sqft: p.sqft,
    price: p.price,
    city: p.city
  }));

  // 5. Price by Bedroom count
  const bedroomGroups = {};
  filtered.forEach(p => {
    const bedKey = p.bedroom >= 4 ? '4+' : p.bedroom.toString();
    if (!bedroomGroups[bedKey]) {
      bedroomGroups[bedKey] = { sum: 0, count: 0 };
    }
    bedroomGroups[bedKey].sum += p.price;
    bedroomGroups[bedKey].count++;
  });
  const priceByRooms = Object.keys(bedroomGroups).map(rooms => ({
    rooms: `${rooms} Bedroom`,
    avgPrice: Math.round(bedroomGroups[rooms].sum / bedroomGroups[rooms].count),
    count: bedroomGroups[rooms].count
  })).sort((a, b) => a.rooms.localeCompare(b.rooms));

  // 6. Price Summary by Unit Type (Studio/0BR, 1BR, 2BR, 3BR, 4BR+)
  // This powers the Price Summary table on the dashboard.
  const unitSegments = [
    { key: 'Studio', label: 'Studio', test: p => p.bedroom === 0 || p.type === 'STUDIO' },
    { key: '1BR', label: '1 Bedroom', test: p => p.bedroom === 1 && p.type !== 'STUDIO' },
    { key: '2BR', label: '2 Bedrooms', test: p => p.bedroom === 2 },
    { key: '3BR', label: '3 Bedrooms', test: p => p.bedroom === 3 },
    { key: '4BR+', label: '4+ Bedrooms', test: p => p.bedroom >= 4 }
  ];

  const priceSummaryByUnitType = unitSegments
    .map(seg => {
      const segProps = filtered.filter(seg.test);
      if (segProps.length === 0) return null;

      const segPrices = segProps.map(p => p.price).filter(p => p > 0);
      const segSqfts = segProps.map(p => p.sqft).filter(s => s > 0);

      // Median
      const segMedian = calculateMedian(segPrices);

      // Mode — most frequent price
      let segMode = null;
      if (segPrices.length > 0) {
        const freq = {};
        segPrices.forEach(p => { freq[p] = (freq[p] || 0) + 1; });
        let maxFreq = 0;
        for (const [price, count] of Object.entries(freq)) {
          if (count > maxFreq) { maxFreq = count; segMode = parseInt(price); }
        }
        // Only report mode if it appears more than once
        if (maxFreq < 2) segMode = null;
      }

      return {
        unitType: seg.label,
        totalUnits: segProps.length,
        avgPrice: segPrices.length > 0 ? Math.round(segPrices.reduce((s, p) => s + p, 0) / segPrices.length) : 0,
        medianPrice: segMedian,
        modePrice: segMode,
        fairPrice: segMedian, // Median is the best estimator of fair market price
        avgSqft: segSqfts.length > 0 ? Math.round(segSqfts.reduce((s, v) => s + v, 0) / segSqfts.length) : 0
      };
    })
    .filter(Boolean); // Remove null segments (no data)

  res.json({
    totalCount,
    avgPrice,
    medianPrice,
    minPrice,
    maxPrice,
    avgPricePerSqft,
    priceDistribution: distributionBuckets,
    priceByType,
    priceByLocation,
    priceVsSize,
    priceByRooms,
    priceSummaryByUnitType,
    availableRentalTypes,
    activePricePeriod,
    activePricePeriodLabel
  });
});

// 3. GET /api/scraper/status: Get background scraping status
app.get('/api/scraper/status', (req, res) => {
  let lastUpdated = 'Never';
  let totalItems = 0;

  if (fs.existsSync(DATA_FILE)) {
    const stats = fs.statSync(DATA_FILE);
    lastUpdated = stats.mtime.toISOString();

    const properties = loadProperties();
    totalItems = properties.length;
  }

  res.json({
    isScraping,
    lastUpdated,
    totalItems,
    progress: scraperProgress
  });
});

// 4. POST /api/scraper/run: Trigger manual scrape
app.post('/api/scraper/run', (req, res) => {
  if (isScraping) {
    return res.status(400).json({ error: 'Scraper is already running in the background.' });
  }

  isScraping = true;
  scraperProgress = {
    status: 'running',
    message: 'Playwright headless browser is starting...',
    progress: 10
  };

  console.log('User triggered manual scraping via API.');

  // Run scraper asynchronously in the background
  scrapeProperties(2) // Scrape 2 pages per location for manual runs to be faster
    .then((data) => {
      scraperProgress = {
        status: 'success',
        message: `Scraping completed successfully! Loaded ${data.length} listings.`,
        progress: 100
      };
    })
    .catch((err) => {
      scraperProgress = {
        status: 'failed',
        message: `Scraping failed: ${err.message}. Reverted to fallback data.`,
        progress: 100
      };
    })
    .finally(() => {
      isScraping = false;
      setTimeout(() => {
        // Reset progress to idle after a brief delay
        if (!isScraping) {
          scraperProgress = { status: 'idle', message: 'Scraper is idle', progress: 0 };
        }
      }, 15000);
    });

  res.json({ message: 'Scraper started successfully in the background.' });
});

// 5. GET /api/export: Download filtered properties as CSV or JSON
app.get('/api/export', (req, res) => {
  const properties = loadProperties();
  const filtered = getFilteredProperties(properties, req.query);
  const format = req.query.format || 'csv';

  // Resolve Area Name
  let areaName = 'All_Areas';
  if (req.query.city) {
    const cities = Array.isArray(req.query.city) ? req.query.city : [req.query.city];
    if (cities.length > 0 && cities[0]) {
      areaName = cities[0].replace(/[^a-zA-Z0-9]+/g, '_');
    }
  } else if (req.query.search) {
    areaName = req.query.search.trim().replace(/[^a-zA-Z0-9]+/g, '_');
  }
  areaName = areaName.replace(/^_+|_+$/g, '');
  if (!areaName) areaName = 'All_Areas';

  // Date format YYYYMMDD
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyymmdd = `${yyyy}${mm}${dd}`;

  const filename = `SPEEDHOME_${areaName}_${yyyymmdd}.${format}`;

  if (format === 'json') {
    res.setHeader('Content-disposition', `attachment; filename=${filename}`);
    res.set('Content-Type', 'application/json');
    return res.status(200).send(JSON.stringify(filtered, null, 2));
  }

  // Export as CSV
  res.setHeader('Content-disposition', `attachment; filename=${filename}`);
  res.set('Content-Type', 'text/csv');

  const headers = ['ID', 'Name', 'Type', 'Furnishing', 'SQFT', 'Bedrooms', 'Bathrooms', 'Carpark', 'Price (RM)', 'Postcode', 'City', 'State', 'Link'];

  let csvContent = headers.join(',') + '\n';

  filtered.forEach(p => {
    const row = [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      p.type,
      p.furnishType,
      p.sqft,
      p.bedroom,
      p.bathroom,
      p.carpark,
      p.price,
      p.postcode,
      p.city,
      p.state,
      `"https://speedhome.com/ads/${p.slug || p.id}"`
    ];
    csvContent += row.join(',') + '\n';
  });

  res.status(200).send(csvContent);
});

// 6. GET /api/autocomplete: Search properties/locations by query string
app.get('/api/autocomplete', (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  if (!q || q.length < 2) {
    return res.json({ locations: [], properties: [] });
  }

  const properties = loadProperties();

  // Collect unique city/location names
  const allCities = [...new Set(properties.map(p => p.city).filter(Boolean))];
  // Collect unique property names
  const allNames = [...new Map(properties.map(p => [p.name, p])).values()];

  // Match location names
  const locationMatches = allCities
    .filter(city => city.toLowerCase().includes(q))
    .slice(0, 4)
    .map(city => {
      const count = properties.filter(p => p.city === city).length;
      return { label: city, type: 'Location', count };
    });

  // Match property names (from actual listings)
  const propertyMatches = allNames
    .filter(p => p.name && p.name.toLowerCase().includes(q))
    .slice(0, 4)
    .map(p => ({
      label: p.name,
      type: 'Property',
      city: p.city,
      id: p.id
    }));

  res.json({ locations: locationMatches, properties: propertyMatches });
});

// 7. POST /api/scraper/scrape-url: Scrape a new SPEEDHOME location from a URL slug
app.post('/api/scraper/scrape-url', async (req, res) => {
  const { slug } = req.body;

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid slug in request body.' });
  }

  // Sanitize slug: lowercase, only alphanumeric and hyphens
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!cleanSlug) {
    return res.status(400).json({ error: 'Invalid slug after sanitization.' });
  }

  try {
    console.log(`[scrape-url] Triggering scrape for slug: ${cleanSlug}`);
    const result = await scrapeLocationBySlug(cleanSlug);
    res.json({
      success: true,
      slug: cleanSlug,
      cityName: result.cityName || cleanSlug,
      newCount: result.newCount || 0,
      totalCount: result.totalCount || 0,
      message: result.totalCount > 0
        ? `Successfully scraped ${result.newCount} new listings for ${result.cityName || cleanSlug}. Database now has ${result.totalCount} properties.`
        : `No new listings found for ${cleanSlug}. The location may not be active on SPEEDHOME.`
    });
  } catch (err) {
    console.error('[scrape-url] Error:', err.message);
    res.status(500).json({ error: 'Scraping failed.', details: err.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Express API Server running on port ${PORT}`);
});
