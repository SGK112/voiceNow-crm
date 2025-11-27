import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = express.Router();

// Geocoding cache to avoid repeated lookups
const geocodeCache = new Map();

/**
 * Reverse geocode coordinates to location name
 */
async function reverseGeocode(latitude, longitude) {
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  try {
    // Using OpenStreetMap Nominatim (free, no API key)
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14`,
      {
        headers: { 'User-Agent': 'VoiceFlow-CRM-Aria/1.0' },
        timeout: 5000,
      }
    );

    const location = {
      city: response.data.address?.city || response.data.address?.town || response.data.address?.village,
      state: response.data.address?.state,
      country: response.data.address?.country,
      zipCode: response.data.address?.postcode,
      county: response.data.address?.county,
      neighborhood: response.data.address?.neighbourhood || response.data.address?.suburb,
      displayName: response.data.display_name,
      raw: response.data.address,
    };

    geocodeCache.set(cacheKey, location);
    return location;
  } catch (error) {
    console.error('Reverse geocode error:', error.message);
    return null;
  }
}

// Web scraping endpoint for Aria
router.post('/fetch', async (req, res) => {
  try {
    const { url, selector, type = 'html' } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    // Fetch the webpage
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 10000,
    });

    if (type === 'json') {
      // Return raw JSON response
      return res.json({
        success: true,
        data: response.data,
        source: url,
      });
    }

    // Parse HTML with Cheerio
    const $ = cheerio.load(response.data);

    // Extract data based on selector
    let extractedData;

    if (selector) {
      // Use custom selector
      extractedData = [];
      $(selector).each((i, elem) => {
        extractedData.push({
          text: $(elem).text().trim(),
          html: $(elem).html(),
          attributes: elem.attribs,
        });
      });
    } else {
      // Default extraction - get main content
      extractedData = {
        title: $('title').text(),
        metaDescription: $('meta[name="description"]').attr('content'),
        headings: [],
        paragraphs: [],
        links: [],
      };

      // Extract headings
      $('h1, h2, h3').each((i, elem) => {
        extractedData.headings.push({
          level: elem.name,
          text: $(elem).text().trim(),
        });
      });

      // Extract paragraphs
      $('p').each((i, elem) => {
        const text = $(elem).text().trim();
        if (text.length > 20) {
          extractedData.paragraphs.push(text);
        }
      });

      // Extract links
      $('a[href]').each((i, elem) => {
        const href = $(elem).attr('href');
        const text = $(elem).text().trim();
        if (href && text) {
          extractedData.links.push({ text, href });
        }
      });
    }

    res.json({
      success: true,
      data: extractedData,
      source: url,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Failed to fetch or parse the webpage',
    });
  }
});

// BrightLocal specific scraper
router.post('/brightlocal', async (req, res) => {
  try {
    const { location, keyword } = req.body;

    if (!location || !keyword) {
      return res.status(400).json({
        success: false,
        error: 'Location and keyword are required',
      });
    }

    // BrightLocal public data endpoints or search results
    // Note: This is a simplified example. For full BrightLocal integration,
    // you'd need their API key
    const searchQuery = encodeURIComponent(`${keyword} ${location}`);
    const googleSearchUrl = `https://www.google.com/search?q=${searchQuery}`;

    const response = await axios.get(googleSearchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const results = [];

    // Extract search results
    $('.g').each((i, elem) => {
      const title = $(elem).find('h3').text();
      const link = $(elem).find('a').attr('href');
      const snippet = $(elem).find('.VwiC3b').text();

      if (title && link) {
        results.push({
          position: i + 1,
          title,
          link,
          snippet,
        });
      }
    });

    res.json({
      success: true,
      location,
      keyword,
      results: results.slice(0, 10),
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('BrightLocal scraping error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Generic API data fetcher
router.post('/api-fetch', async (req, res) => {
  try {
    const { url, method = 'GET', headers = {}, body } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
      });
    }

    const config = {
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      timeout: 15000,
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      config.data = body;
    }

    const response = await axios(config);

    res.json({
      success: true,
      data: response.data,
      status: response.status,
      source: url,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('API fetch error:', error);
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.message,
      status: error.response?.status,
    });
  }
});

// Batch scraping endpoint
router.post('/batch', async (req, res) => {
  try {
    const { urls } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Array of URLs is required',
      });
    }

    if (urls.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 URLs allowed per batch',
      });
    }

    const results = await Promise.allSettled(
      urls.map(async (url) => {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          timeout: 10000,
        });

        const $ = cheerio.load(response.data);
        return {
          url,
          title: $('title').text(),
          description: $('meta[name="description"]').attr('content'),
          status: 'success',
        };
      })
    );

    const processedResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          url: urls[index],
          status: 'failed',
          error: result.reason.message,
        };
      }
    });

    res.json({
      success: true,
      results: processedResults,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Batch scraping error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Location-based search endpoint for Aria
router.post('/location-search', async (req, res) => {
  try {
    const { query, latitude, longitude, radius = 10, category } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }

    // Get location name from coordinates if provided
    let locationName = '';
    let locationData = null;
    if (latitude && longitude) {
      locationData = await reverseGeocode(latitude, longitude);
      locationName = locationData?.city
        ? `${locationData.city}, ${locationData.state || locationData.country}`
        : '';
    }

    // Build search query with location
    const searchQuery = locationName
      ? `${query} near ${locationName}`
      : query;

    console.log(`[LocationSearch] Query: "${searchQuery}"${locationName ? ` (${locationName})` : ''}`);

    // Search using DuckDuckGo HTML (more permissive than Google)
    const encodedQuery = encodeURIComponent(searchQuery);
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    const results = [];

    // Parse DuckDuckGo results
    $('.result').each((i, elem) => {
      const titleElem = $(elem).find('.result__title a');
      const snippetElem = $(elem).find('.result__snippet');
      const urlElem = $(elem).find('.result__url');

      const title = titleElem.text().trim();
      let link = titleElem.attr('href');
      const snippet = snippetElem.text().trim();
      const displayUrl = urlElem.text().trim();

      // DuckDuckGo uses redirect URLs, extract actual URL
      if (link && link.includes('uddg=')) {
        const urlMatch = link.match(/uddg=([^&]+)/);
        if (urlMatch) {
          link = decodeURIComponent(urlMatch[1]);
        }
      }

      if (title && link) {
        results.push({
          position: i + 1,
          title,
          link,
          snippet,
          displayUrl,
        });
      }
    });

    res.json({
      success: true,
      query: searchQuery,
      location: locationData,
      coordinates: latitude && longitude ? { latitude, longitude } : null,
      results: results.slice(0, 10),
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Location search error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Nearby places search (businesses, restaurants, services)
router.post('/nearby', async (req, res) => {
  try {
    const { latitude, longitude, type, radius = 5000, keyword } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required',
      });
    }

    // Get location context
    const locationData = await reverseGeocode(latitude, longitude);
    const locationName = locationData?.city || locationData?.neighborhood || 'your area';

    // Build search query for local results
    const searchTerms = [];
    if (keyword) searchTerms.push(keyword);
    if (type) searchTerms.push(type);
    searchTerms.push(`near ${locationName}`);

    const searchQuery = searchTerms.join(' ');
    const encodedQuery = encodeURIComponent(searchQuery);

    // Use DuckDuckGo for local search
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    const results = [];

    $('.result').each((i, elem) => {
      const titleElem = $(elem).find('.result__title a');
      const snippetElem = $(elem).find('.result__snippet');

      const title = titleElem.text().trim();
      let link = titleElem.attr('href');
      const snippet = snippetElem.text().trim();

      if (link && link.includes('uddg=')) {
        const urlMatch = link.match(/uddg=([^&]+)/);
        if (urlMatch) {
          link = decodeURIComponent(urlMatch[1]);
        }
      }

      if (title && link) {
        results.push({
          position: i + 1,
          title,
          link,
          snippet,
        });
      }
    });

    res.json({
      success: true,
      query: searchQuery,
      location: locationData,
      coordinates: { latitude, longitude },
      results: results.slice(0, 15),
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Nearby search error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get location info from coordinates
router.post('/geocode', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required',
      });
    }

    const locationData = await reverseGeocode(latitude, longitude);

    if (locationData) {
      res.json({
        success: true,
        location: locationData,
        coordinates: { latitude, longitude },
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Could not determine location',
      });
    }
  } catch (error) {
    console.error('Geocode error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Weather for location (using open-meteo - free, no API key)
router.post('/weather', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required',
      });
    }

    // Get current weather from Open-Meteo
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`;

    const [weatherResponse, locationData] = await Promise.all([
      axios.get(weatherUrl, { timeout: 10000 }),
      reverseGeocode(latitude, longitude),
    ]);

    const current = weatherResponse.data.current;

    // Weather code descriptions
    const weatherCodes = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      77: 'Snow grains',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      85: 'Slight snow showers',
      86: 'Heavy snow showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with hail',
      99: 'Thunderstorm with heavy hail',
    };

    res.json({
      success: true,
      location: locationData,
      weather: {
        temperature: current.temperature_2m,
        feelsLike: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        precipitation: current.precipitation,
        windSpeed: current.wind_speed_10m,
        condition: weatherCodes[current.weather_code] || 'Unknown',
        code: current.weather_code,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Weather error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
