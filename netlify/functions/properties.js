const { loadProperties, getFilteredProperties, headers } = require('./utils/data');

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: headers(), body: '' };
  }

  try {
    const query = event.queryStringParameters || {};
    const properties = loadProperties();
    const filtered = getFilteredProperties(properties, query);

    // Sorting
    const sortBy = query.sortBy || 'dateCreated';
    const order = query.order || 'desc';

    filtered.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === 'dateCreated') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      if (valA < valB) return order === 'asc' ? -1 : 1;
      if (valA > valB) return order === 'asc' ? 1 : -1;
      return 0;
    });

    // Pagination
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 12;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    return {
      statusCode: 200,
      headers: headers(),
      body: JSON.stringify({
        total: filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit),
        data: paginated
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
