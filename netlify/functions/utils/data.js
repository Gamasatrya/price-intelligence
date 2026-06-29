const fs = require('fs');
const path = require('path');

// In Netlify Functions, we bundle the data alongside the function
const DATA_FILE = path.join(__dirname, '../data/properties.json');

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

function getFilteredProperties(properties, query) {
  const activeRentalType = (query.rentalType || 'ALL').toUpperCase();
  const activePricePeriod = activeRentalType === 'ALL' ? 'MONTHLY' : activeRentalType;

  let filtered = properties.map(p => {
    const prices = p.rentalPrices || {
      DAILY: p.rentalType === 'DAILY' ? p.price : null,
      MONTHLY: p.rentalType === 'MONTHLY' || !p.rentalType ? p.price : null,
      YEARLY: p.rentalType === 'YEARLY' ? p.price : null
    };

    let activePrice = prices[activePricePeriod];
    let activeType = activePricePeriod;

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
      price: activePrice,
      rentalType: activeType
    };
  });

  if (activeRentalType !== 'ALL') {
    filtered = filtered.filter(p => p.price !== null && p.price !== undefined);
  }

  if (query.city) {
    const cities = Array.isArray(query.city) ? query.city : [query.city];
    filtered = filtered.filter(p => cities.some(c => p.city.toLowerCase() === c.toLowerCase()));
  }

  if (query.type) {
    const types = Array.isArray(query.type) ? query.type : [query.type];
    filtered = filtered.filter(p => types.some(t => p.type.toLowerCase() === t.toLowerCase()));
  }

  if (query.furnishType) {
    const furnishes = Array.isArray(query.furnishType) ? query.furnishType : [query.furnishType];
    filtered = filtered.filter(p => furnishes.some(f => p.furnishType.toLowerCase() === f.toLowerCase()));
  }

  if (query.minPrice) {
    filtered = filtered.filter(p => p.price >= parseInt(query.minPrice));
  }
  if (query.maxPrice) {
    filtered = filtered.filter(p => p.price <= parseInt(query.maxPrice));
  }

  if (query.minSqft) {
    filtered = filtered.filter(p => p.sqft >= parseInt(query.minSqft));
  }
  if (query.maxSqft) {
    filtered = filtered.filter(p => p.sqft <= parseInt(query.maxSqft));
  }

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

  if (query.search) {
    const searchVal = query.search.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(searchVal) ||
      p.postcode.includes(searchVal)
    );
  }

  return filtered;
}

function calculateMedian(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function getPricePeriodLabel(rentalType) {
  switch ((rentalType || 'MONTHLY').toUpperCase()) {
    case 'DAILY': return '/day';
    case 'YEARLY': return '/year';
    default: return '/month';
  }
}

// Helper to build standard response headers (CORS + no-cache)
function headers() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Content-Type': 'application/json'
  };
}

module.exports = {
  loadProperties,
  getFilteredProperties,
  calculateMedian,
  getPricePeriodLabel,
  headers
};
