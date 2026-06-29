const { loadProperties, getFilteredProperties, headers } = require('./utils/data');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: headers(), body: '' };
  }

  try {
    const query = event.queryStringParameters || {};
    const properties = loadProperties();
    const filtered = getFilteredProperties(properties, query);
    const format = query.format || 'csv';

    // Resolve Area Name
    let areaName = 'All_Areas';
    if (query.city) {
      const cities = Array.isArray(query.city) ? query.city : [query.city];
      if (cities.length > 0 && cities[0]) {
        areaName = cities[0].replace(/[^a-zA-Z0-9]+/g, '_');
      }
    } else if (query.search) {
      areaName = query.search.trim().replace(/[^a-zA-Z0-9]+/g, '_');
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
      return {
        statusCode: 200,
        headers: {
          ...headers(),
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename=${filename}`
        },
        body: JSON.stringify(filtered, null, 2)
      };
    }

    // CSV export
    const csvHeaders = ['ID', 'Name', 'Type', 'Furnishing', 'SQFT', 'Bedrooms', 'Bathrooms', 'Carpark', 'Price (RM)', 'Postcode', 'City', 'State', 'Link'];
    let csvContent = csvHeaders.join(',') + '\n';

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

    return {
      statusCode: 200,
      headers: {
        ...headers(),
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=${filename}`
      },
      body: csvContent
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: headers(),
      body: JSON.stringify({ error: err.message })
    };
  }
};
