import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = express.Router();

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

export default router;
