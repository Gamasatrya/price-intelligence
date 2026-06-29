const { loadProperties, headers } = require('./utils/data');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: headers(), body: '' };
  }

  try {
    const properties = loadProperties();

    return {
      statusCode: 200,
      headers: headers(),
      body: JSON.stringify({
        isScraping: false,
        lastUpdated: properties.length > 0 ? new Date().toISOString() : 'Never',
        totalItems: properties.length,
        progress: {
          status: 'idle',
          message: 'Scraper is available in local development mode only.',
          progress: 0
        }
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
