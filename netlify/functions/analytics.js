const { loadProperties, getFilteredProperties, calculateMedian, getPricePeriodLabel, headers } = require('./utils/data');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: headers(), body: '' };
  }

  try {
    const query = event.queryStringParameters || {};
    const properties = loadProperties();

    // Compute available rental types BEFORE filtering (for UI pill show/hide)
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

    const activeRentalType = (query.rentalType || 'ALL').toUpperCase();
    const activePricePeriod = activeRentalType === 'ALL' ? 'MONTHLY' : activeRentalType;
    const activePricePeriodLabel = getPricePeriodLabel(activePricePeriod);

    const filtered = getFilteredProperties(properties, query);
    const totalCount = filtered.length;

    if (totalCount === 0) {
      return {
        statusCode: 200,
        headers: headers(),
        body: JSON.stringify({
          totalCount: 0, avgPrice: 0, medianPrice: 0, minPrice: 0, maxPrice: 0,
          avgPricePerSqft: 0, priceDistribution: [], priceByType: [],
          priceByLocation: [], priceVsSize: [], priceByRooms: [],
          priceSummaryByUnitType: [],
          availableRentalTypes, activePricePeriod, activePricePeriodLabel
        })
      };
    }

    const prices = filtered.map(p => p.price);
    const sumPrice = prices.reduce((sum, p) => sum + p, 0);
    const avgPrice = Math.round(sumPrice / totalCount);
    const medianPrice = calculateMedian(prices);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const validSqftProps = filtered.filter(p => p.sqft > 0);
    const avgPricePerSqft = validSqftProps.length > 0
      ? parseFloat((validSqftProps.reduce((sum, p) => sum + (p.price / p.sqft), 0) / validSqftProps.length).toFixed(2))
      : 0;

    // Price Distribution Histogram
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
        if (price >= bucket.min && price <= bucket.max) { bucket.count++; break; }
      }
    });

    // Price by Property Type
    const typeGroups = {};
    filtered.forEach(p => {
      if (!typeGroups[p.type]) typeGroups[p.type] = { sum: 0, count: 0 };
      typeGroups[p.type].sum += p.price;
      typeGroups[p.type].count++;
    });
    const priceByType = Object.keys(typeGroups).map(type => ({
      type: type === 'HIGHRISE' ? 'High-Rise Condo' : type === 'LANDED' ? 'Landed House' : 'Studio',
      avgPrice: Math.round(typeGroups[type].sum / typeGroups[type].count),
      count: typeGroups[type].count
    }));

    // Price by Location
    const locationGroups = {};
    filtered.forEach(p => {
      if (!locationGroups[p.city]) locationGroups[p.city] = { sum: 0, count: 0 };
      locationGroups[p.city].sum += p.price;
      locationGroups[p.city].count++;
    });
    const priceByLocation = Object.keys(locationGroups).map(city => ({
      city,
      avgPrice: Math.round(locationGroups[city].sum / locationGroups[city].count),
      count: locationGroups[city].count
    }));

    // Price vs Size scatter
    const priceVsSize = filtered.slice(0, 200).map(p => ({
      name: p.name, sqft: p.sqft, price: p.price, city: p.city
    }));

    // Price by Bedrooms
    const bedroomGroups = {};
    filtered.forEach(p => {
      const bedKey = p.bedroom >= 4 ? '4+' : p.bedroom.toString();
      if (!bedroomGroups[bedKey]) bedroomGroups[bedKey] = { sum: 0, count: 0 };
      bedroomGroups[bedKey].sum += p.price;
      bedroomGroups[bedKey].count++;
    });
    const priceByRooms = Object.keys(bedroomGroups).map(rooms => ({
      rooms: `${rooms} Bedroom`,
      avgPrice: Math.round(bedroomGroups[rooms].sum / bedroomGroups[rooms].count),
      count: bedroomGroups[rooms].count
    })).sort((a, b) => a.rooms.localeCompare(b.rooms));

    // Price Summary by Unit Type
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
        const segMedian = calculateMedian(segPrices);
        let segMode = null;
        if (segPrices.length > 0) {
          const freq = {};
          segPrices.forEach(p => { freq[p] = (freq[p] || 0) + 1; });
          let maxFreq = 0;
          for (const [price, count] of Object.entries(freq)) {
            if (count > maxFreq) { maxFreq = count; segMode = parseInt(price); }
          }
          if (maxFreq < 2) segMode = null;
        }
        return {
          unitType: seg.label,
          totalUnits: segProps.length,
          avgPrice: segPrices.length > 0 ? Math.round(segPrices.reduce((s, p) => s + p, 0) / segPrices.length) : 0,
          medianPrice: segMedian,
          modePrice: segMode,
          fairPrice: segMedian,
          avgSqft: segSqfts.length > 0 ? Math.round(segSqfts.reduce((s, v) => s + v, 0) / segSqfts.length) : 0
        };
      })
      .filter(Boolean);

    return {
      statusCode: 200,
      headers: headers(),
      body: JSON.stringify({
        totalCount, avgPrice, medianPrice, minPrice, maxPrice, avgPricePerSqft,
        priceDistribution: distributionBuckets, priceByType, priceByLocation,
        priceVsSize, priceByRooms, priceSummaryByUnitType,
        availableRentalTypes, activePricePeriod, activePricePeriodLabel
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: headers(),
      body: JSON.stringify({ error: err.message })
    };
  }
};
