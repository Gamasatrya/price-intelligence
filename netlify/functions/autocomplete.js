const { loadProperties, headers } = require('./utils/data');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: headers(), body: '' };
  }

  try {
    const query = event.queryStringParameters || {};
    const q = (query.q || '').toLowerCase().trim();

    if (!q || q.length < 2) {
      return {
        statusCode: 200,
        headers: headers(),
        body: JSON.stringify({ locations: [], properties: [] })
      };
    }

    const properties = loadProperties();

    // Collect unique city names
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

    // Match property names
    const propertyMatches = allNames
      .filter(p => p.name && p.name.toLowerCase().includes(q))
      .slice(0, 4)
      .map(p => ({
        label: p.name,
        type: 'Property',
        city: p.city,
        id: p.id
      }));

    return {
      statusCode: 200,
      headers: headers(),
      body: JSON.stringify({ locations: locationMatches, properties: propertyMatches })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: headers(),
      body: JSON.stringify({ error: err.message })
    };
  }
};
