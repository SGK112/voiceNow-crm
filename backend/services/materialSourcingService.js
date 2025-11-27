import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Material Sourcing Service for Aria
 *
 * A comprehensive system for searching, comparing, and presenting construction materials
 * with intelligent local-first sourcing and visual presentation capabilities.
 */
class MaterialSourcingService {
  constructor() {
    // Supplier Database - Miami/South Florida focused with national fallbacks
    this.suppliers = {
      // Premium Local Suppliers (Priority 1)
      msi_surfaces: {
        name: 'MSI Surfaces',
        type: 'distributor',
        priority: 1,
        local: true,
        region: 'Miami',
        specialties: ['quartz', 'granite', 'marble', 'porcelain', 'natural_stone', 'lvp'],
        website: 'https://www.msisurfaces.com',
        searchUrl: 'https://www.msisurfaces.com/search/?q=',
        imageSearchUrl: 'https://www.msisurfaces.com/quartz-countertops/',
        priceRange: 'mid-premium',
        hasImages: true,
        apiAvailable: false,
        contactInfo: {
          phone: '(305) 885-0303',
          address: 'Miami, FL'
        }
      },
      daltile: {
        name: 'Daltile',
        type: 'manufacturer',
        priority: 1,
        local: true,
        region: 'Miami',
        specialties: ['ceramic_tile', 'porcelain_tile', 'natural_stone', 'mosaics'],
        website: 'https://www.daltile.com',
        searchUrl: 'https://www.daltile.com/search?q=',
        priceRange: 'mid-premium',
        hasImages: true,
        apiAvailable: false
      },
      boulder_images: {
        name: 'Boulder Images Stone',
        type: 'fabricator',
        priority: 1,
        local: true,
        region: 'Miami',
        specialties: ['granite', 'marble', 'quartzite', 'custom_fabrication'],
        website: 'https://www.boulderimages.com',
        priceRange: 'premium-luxury',
        hasImages: true,
        apiAvailable: false
      },
      floor_and_decor: {
        name: 'Floor & Decor',
        type: 'retailer',
        priority: 2,
        local: true,
        region: 'South Florida',
        specialties: ['tile', 'wood_flooring', 'laminate', 'stone', 'countertops'],
        website: 'https://www.flooranddecor.com',
        searchUrl: 'https://www.flooranddecor.com/search?q=',
        priceRange: 'budget-mid',
        hasImages: true,
        apiAvailable: false
      },
      tile_bar: {
        name: 'TileBar',
        type: 'retailer',
        priority: 2,
        local: false,
        specialties: ['tile', 'mosaics', 'backsplash', 'decorative'],
        website: 'https://www.tilebar.com',
        searchUrl: 'https://www.tilebar.com/catalogsearch/result/?q=',
        priceRange: 'mid-premium',
        hasImages: true,
        apiAvailable: false
      },

      // National Retailers (Priority 3)
      home_depot: {
        name: 'The Home Depot',
        type: 'retailer',
        priority: 3,
        local: true,
        region: 'National',
        specialties: ['all_materials', 'cabinets', 'fixtures', 'lumber', 'paint'],
        website: 'https://www.homedepot.com',
        searchUrl: 'https://www.homedepot.com/s/',
        priceRange: 'budget-mid',
        hasImages: true,
        apiAvailable: false
      },
      lowes: {
        name: "Lowe's",
        type: 'retailer',
        priority: 3,
        local: true,
        region: 'National',
        specialties: ['all_materials', 'cabinets', 'fixtures', 'lumber', 'appliances'],
        website: 'https://www.lowes.com',
        searchUrl: 'https://www.lowes.com/search?searchTerm=',
        priceRange: 'budget-mid',
        hasImages: true,
        apiAvailable: false
      },

      // Specialty Suppliers
      bedrosians: {
        name: 'Bedrosians Tile & Stone',
        type: 'distributor',
        priority: 2,
        local: false,
        specialties: ['porcelain', 'ceramic', 'natural_stone', 'mosaics'],
        website: 'https://www.bedrosians.com',
        priceRange: 'mid-premium',
        hasImages: true
      },
      arizona_tile: {
        name: 'Arizona Tile',
        type: 'distributor',
        priority: 2,
        local: false,
        specialties: ['slab', 'tile', 'stone', 'quartz'],
        website: 'https://www.arizonatile.com',
        priceRange: 'mid-premium',
        hasImages: true
      },
      cambria: {
        name: 'Cambria',
        type: 'manufacturer',
        priority: 2,
        local: false,
        specialties: ['quartz_countertops'],
        website: 'https://www.cambriausa.com',
        priceRange: 'premium-luxury',
        hasImages: true
      },
      caesarstone: {
        name: 'Caesarstone',
        type: 'manufacturer',
        priority: 2,
        local: false,
        specialties: ['quartz_countertops'],
        website: 'https://www.caesarstoneus.com',
        priceRange: 'premium',
        hasImages: true
      },
      silestone: {
        name: 'Silestone by Cosentino',
        type: 'manufacturer',
        priority: 2,
        local: false,
        specialties: ['quartz_countertops', 'surfaces'],
        website: 'https://www.silestone.com',
        priceRange: 'premium',
        hasImages: true
      }
    };

    // Material Categories with common search terms and typical price ranges
    this.categories = {
      countertops: {
        materials: ['quartz', 'granite', 'marble', 'quartzite', 'soapstone', 'concrete', 'butcher_block', 'laminate', 'solid_surface'],
        searchTerms: ['countertop', 'counter top', 'kitchen counter', 'bathroom vanity top', 'island top'],
        priceUnit: 'per_sqft_installed',
        typicalPrices: {
          laminate: { min: 10, max: 40 },
          solid_surface: { min: 40, max: 100 },
          granite: { min: 50, max: 200 },
          quartz: { min: 50, max: 150 },
          marble: { min: 75, max: 250 },
          quartzite: { min: 100, max: 300 }
        }
      },
      tile: {
        materials: ['ceramic', 'porcelain', 'natural_stone', 'glass', 'mosaic', 'terracotta', 'encaustic'],
        searchTerms: ['tile', 'floor tile', 'wall tile', 'backsplash', 'shower tile'],
        priceUnit: 'per_sqft',
        typicalPrices: {
          ceramic: { min: 1, max: 15 },
          porcelain: { min: 3, max: 25 },
          natural_stone: { min: 8, max: 50 },
          glass: { min: 15, max: 75 },
          mosaic: { min: 10, max: 100 }
        }
      },
      flooring: {
        materials: ['hardwood', 'engineered_wood', 'lvp', 'lvt', 'laminate', 'bamboo', 'cork', 'concrete'],
        searchTerms: ['flooring', 'floor', 'wood floor', 'vinyl plank', 'hardwood'],
        priceUnit: 'per_sqft',
        typicalPrices: {
          laminate: { min: 1, max: 5 },
          lvp: { min: 2, max: 8 },
          engineered_wood: { min: 4, max: 15 },
          hardwood: { min: 6, max: 20 },
          bamboo: { min: 3, max: 10 }
        }
      },
      stone: {
        materials: ['marble', 'granite', 'quartzite', 'limestone', 'travertine', 'slate', 'onyx'],
        searchTerms: ['stone', 'natural stone', 'slab', 'stone tile'],
        priceUnit: 'per_sqft',
        typicalPrices: {
          slate: { min: 4, max: 20 },
          limestone: { min: 8, max: 30 },
          travertine: { min: 5, max: 25 },
          granite: { min: 10, max: 50 },
          marble: { min: 15, max: 75 },
          quartzite: { min: 20, max: 100 },
          onyx: { min: 50, max: 200 }
        }
      },
      cabinets: {
        materials: ['wood', 'mdf', 'plywood', 'thermofoil', 'laminate'],
        styles: ['shaker', 'raised_panel', 'flat_panel', 'beadboard', 'glass_front', 'open_shelf'],
        searchTerms: ['cabinets', 'kitchen cabinets', 'bathroom vanity', 'cabinet doors'],
        priceUnit: 'per_linear_ft',
        typicalPrices: {
          stock: { min: 100, max: 300 },
          semi_custom: { min: 150, max: 650 },
          custom: { min: 500, max: 1500 }
        }
      },
      fixtures: {
        types: ['faucets', 'sinks', 'toilets', 'showers', 'bathtubs', 'lighting'],
        searchTerms: ['fixture', 'faucet', 'sink', 'bathroom fixture', 'kitchen fixture'],
        priceUnit: 'each'
      },
      paint: {
        types: ['interior', 'exterior', 'primer', 'specialty'],
        finishes: ['flat', 'eggshell', 'satin', 'semi_gloss', 'gloss'],
        brands: ['Benjamin Moore', 'Sherwin Williams', 'Behr', 'PPG', 'Farrow & Ball'],
        searchTerms: ['paint', 'wall paint', 'interior paint', 'exterior paint'],
        priceUnit: 'per_gallon'
      }
    };

    // Style/Design Keywords for intelligent search enhancement
    this.styleKeywords = {
      modern: ['contemporary', 'minimalist', 'sleek', 'clean lines', 'geometric'],
      traditional: ['classic', 'ornate', 'detailed', 'timeless', 'elegant'],
      transitional: ['blend', 'versatile', 'neutral', 'balanced'],
      farmhouse: ['rustic', 'country', 'shiplap', 'reclaimed', 'barn'],
      industrial: ['raw', 'exposed', 'metal', 'concrete', 'urban'],
      coastal: ['beach', 'nautical', 'light', 'airy', 'blue', 'white'],
      mediterranean: ['tuscan', 'spanish', 'terracotta', 'warm', 'textured'],
      mid_century_modern: ['retro', '1960s', 'organic', 'wood', 'bold colors']
    };

    // Color palettes for material matching
    this.colorPalettes = {
      neutral: ['white', 'gray', 'beige', 'cream', 'taupe', 'greige'],
      warm: ['brown', 'tan', 'terracotta', 'rust', 'gold', 'copper'],
      cool: ['blue', 'green', 'purple', 'silver', 'charcoal'],
      bold: ['black', 'navy', 'emerald', 'burgundy', 'red'],
      natural: ['wood tones', 'stone', 'earth', 'sand', 'moss']
    };
  }

  /**
   * Intelligent material search with image scraping
   * Searches multiple suppliers, prioritizes local, returns with images
   */
  async searchMaterials(query, options = {}) {
    const {
      category = 'auto',
      style = null,
      color = null,
      priceRange = 'any',
      suppliersToSearch = 'local_first',
      maxResults = 12,
      includeImages = true,
      forProject = null
    } = options;

    console.log(`\n🔍 [MATERIAL SEARCH] ═══════════════════════════════════`);
    console.log(`   Query: "${query}"`);
    console.log(`   Category: ${category}, Style: ${style || 'any'}, Price: ${priceRange}`);

    // Detect category if auto
    const detectedCategory = category === 'auto' ? this.detectCategory(query) : category;

    // Build enhanced search query
    const enhancedQuery = this.buildSmartQuery(query, {
      category: detectedCategory,
      style,
      color,
      priceRange
    });

    // Determine which suppliers to search
    const suppliersToQuery = this.selectSuppliers(detectedCategory, suppliersToSearch, priceRange);

    console.log(`   Enhanced Query: "${enhancedQuery}"`);
    console.log(`   Searching ${suppliersToQuery.length} suppliers...`);

    // Search all selected suppliers in parallel
    const searchPromises = suppliersToQuery.map(supplier =>
      this.searchSupplier(supplier, enhancedQuery, { includeImages, maxResults: Math.ceil(maxResults / suppliersToQuery.length) })
    );

    const results = await Promise.allSettled(searchPromises);

    // Aggregate and deduplicate results
    let allProducts = [];
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.products) {
        allProducts = allProducts.concat(result.value.products);
      }
    }

    // Sort by relevance and local priority
    allProducts = this.rankResults(allProducts, {
      query,
      category: detectedCategory,
      style,
      color,
      priceRange
    });

    // Fetch images for top results if needed
    if (includeImages) {
      allProducts = await this.enrichWithImages(allProducts.slice(0, maxResults), query);
    }

    const finalResults = allProducts.slice(0, maxResults);

    console.log(`   ✅ Found ${finalResults.length} products`);
    console.log(`═══════════════════════════════════════════════════════\n`);

    return {
      success: true,
      query,
      enhancedQuery,
      category: detectedCategory,
      totalResults: finalResults.length,
      products: finalResults,
      suppliers: suppliersToQuery.map(s => s.name),
      priceGuidance: this.getPriceGuidance(detectedCategory, query),
      suggestions: this.generateSuggestions(query, detectedCategory, finalResults),
      action: 'material_search_results',
      uiAction: {
        type: 'show_materials',
        displayMode: 'grid',
        data: { products: finalResults, category: detectedCategory }
      }
    };
  }

  /**
   * Search a specific supplier
   */
  async searchSupplier(supplier, query, options = {}) {
    const { includeImages = true, maxResults = 5 } = options;

    try {
      // Use web search with site restriction for supplier
      const domain = new URL(supplier.website).hostname;
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' site:' + domain)}`;

      const response = await axios.get(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const products = [];

      $('.result').slice(0, maxResults).each((i, elem) => {
        const title = $(elem).find('.result__title').text().trim();
        const snippet = $(elem).find('.result__snippet').text().trim();
        const url = $(elem).find('.result__a').attr('href') || $(elem).find('.result__url').text().trim();

        if (title && snippet) {
          // Extract price if present
          const priceMatch = snippet.match(/\$[\d,]+\.?\d*/g);
          const price = priceMatch ? priceMatch[0] : null;

          // Extract dimensions/size if present
          const sizeMatch = snippet.match(/(\d+["']?\s*x\s*\d+["']?)/i);
          const size = sizeMatch ? sizeMatch[1] : null;

          products.push({
            name: this.cleanProductName(title),
            description: snippet.slice(0, 200),
            url,
            supplier: supplier.name,
            supplierType: supplier.type,
            isLocal: supplier.local,
            priority: supplier.priority,
            price,
            size,
            priceRange: supplier.priceRange,
            imageUrl: null // Will be enriched later
          });
        }
      });

      return { success: true, supplier: supplier.name, products };

    } catch (error) {
      console.error(`   ⚠️ Error searching ${supplier.name}:`, error.message);
      return { success: false, supplier: supplier.name, products: [], error: error.message };
    }
  }

  /**
   * Enrich products with actual images via image search
   */
  async enrichWithImages(products, baseQuery) {
    // Use Google Images-style search via DuckDuckGo or direct supplier scraping
    for (let product of products) {
      try {
        // Try to get image from supplier's website directly
        if (product.url && product.url.startsWith('http')) {
          const imageUrl = await this.scrapeProductImage(product.url);
          if (imageUrl) {
            product.imageUrl = imageUrl;
            continue;
          }
        }

        // Fallback: use product name for image search
        const imageSearchQuery = `${product.name} ${product.supplier}`;
        product.imageUrl = await this.searchForImage(imageSearchQuery);

      } catch (error) {
        console.log(`   ⚠️ Could not get image for ${product.name}`);
      }
    }

    return products;
  }

  /**
   * Scrape product image from a supplier's product page
   */
  async scrapeProductImage(url) {
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
        timeout: 8000
      });

      const $ = cheerio.load(response.data);

      // Try common image selectors
      const imageSelectors = [
        'meta[property="og:image"]',
        '.product-image img',
        '.gallery-image img',
        '#product-image img',
        '.main-image img',
        '[data-main-image]',
        '.pdp-image img',
        'img.primary-image',
        '.product-gallery img:first'
      ];

      for (const selector of imageSelectors) {
        const img = $(selector);
        if (img.length) {
          let src = img.attr('content') || img.attr('src') || img.attr('data-src');
          if (src) {
            // Make absolute URL
            if (src.startsWith('//')) src = 'https:' + src;
            else if (src.startsWith('/')) src = new URL(url).origin + src;
            return src;
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Search for product image using image search
   */
  async searchForImage(query) {
    try {
      // Use Unsplash API as fallback for generic material images
      const unsplashUrl = `https://source.unsplash.com/400x300/?${encodeURIComponent(query)}`;
      return unsplashUrl;
    } catch {
      return null;
    }
  }

  /**
   * Detect material category from query
   */
  detectCategory(query) {
    const lowerQuery = query.toLowerCase();

    for (const [category, config] of Object.entries(this.categories)) {
      for (const term of config.searchTerms || []) {
        if (lowerQuery.includes(term)) return category;
      }
      for (const material of config.materials || []) {
        if (lowerQuery.includes(material.replace('_', ' '))) return category;
      }
    }

    // Default based on common keywords
    if (/counter|quartz|granite|marble/i.test(query)) return 'countertops';
    if (/tile|backsplash|mosaic/i.test(query)) return 'tile';
    if (/floor|hardwood|vinyl|laminate/i.test(query)) return 'flooring';
    if (/cabinet|vanity/i.test(query)) return 'cabinets';

    return 'general';
  }

  /**
   * Build an enhanced search query with smart additions
   */
  buildSmartQuery(baseQuery, options) {
    const { category, style, color, priceRange } = options;
    let query = baseQuery;

    // Add style modifiers
    if (style && this.styleKeywords[style]) {
      const styleWord = this.styleKeywords[style][0];
      if (!query.toLowerCase().includes(styleWord)) {
        query += ` ${styleWord}`;
      }
    }

    // Add color if specified
    if (color && !query.toLowerCase().includes(color)) {
      query += ` ${color}`;
    }

    // Add price-related terms
    if (priceRange === 'budget') {
      query += ' affordable value';
    } else if (priceRange === 'luxury') {
      query += ' premium luxury high-end';
    }

    return query.trim();
  }

  /**
   * Select which suppliers to search based on category and preferences
   */
  selectSuppliers(category, preference, priceRange) {
    let supplierList = Object.values(this.suppliers);

    // Filter by category specialties if known
    if (category !== 'general' && this.categories[category]) {
      const categoryMaterials = this.categories[category].materials || [];
      supplierList = supplierList.filter(s => {
        if (!s.specialties) return true;
        return s.specialties.some(spec =>
          categoryMaterials.some(mat => spec.includes(mat) || mat.includes(spec)) ||
          spec === 'all_materials'
        );
      });
    }

    // Filter by price range
    if (priceRange === 'budget') {
      supplierList = supplierList.filter(s => s.priceRange?.includes('budget'));
    } else if (priceRange === 'luxury') {
      supplierList = supplierList.filter(s => s.priceRange?.includes('premium') || s.priceRange?.includes('luxury'));
    }

    // Sort by priority (local first)
    if (preference === 'local_first') {
      supplierList.sort((a, b) => {
        if (a.local && !b.local) return -1;
        if (!a.local && b.local) return 1;
        return a.priority - b.priority;
      });
    }

    // Return top suppliers
    return supplierList.slice(0, 6);
  }

  /**
   * Rank and sort results by relevance
   */
  rankResults(products, context) {
    return products.sort((a, b) => {
      let scoreA = 0, scoreB = 0;

      // Local supplier bonus
      if (a.isLocal) scoreA += 30;
      if (b.isLocal) scoreB += 30;

      // Supplier priority (lower is better)
      scoreA -= (a.priority || 3) * 5;
      scoreB -= (b.priority || 3) * 5;

      // Has price bonus
      if (a.price) scoreA += 10;
      if (b.price) scoreB += 10;

      // Has image bonus
      if (a.imageUrl) scoreA += 15;
      if (b.imageUrl) scoreB += 15;

      // Query relevance (name contains query terms)
      const queryTerms = context.query.toLowerCase().split(' ');
      for (const term of queryTerms) {
        if (a.name.toLowerCase().includes(term)) scoreA += 5;
        if (b.name.toLowerCase().includes(term)) scoreB += 5;
      }

      return scoreB - scoreA;
    });
  }

  /**
   * Get price guidance for a category
   */
  getPriceGuidance(category, query) {
    const categoryConfig = this.categories[category];
    if (!categoryConfig || !categoryConfig.typicalPrices) {
      return null;
    }

    // Try to determine specific material type
    const lowerQuery = query.toLowerCase();
    for (const [material, prices] of Object.entries(categoryConfig.typicalPrices)) {
      if (lowerQuery.includes(material.replace('_', ' '))) {
        return {
          material,
          priceRange: `$${prices.min} - $${prices.max}`,
          unit: categoryConfig.priceUnit,
          note: 'Prices vary by quality, thickness, and installation complexity'
        };
      }
    }

    return {
      category,
      generalRange: 'Varies by material and quality',
      unit: categoryConfig.priceUnit
    };
  }

  /**
   * Generate smart suggestions based on search
   */
  generateSuggestions(query, category, results) {
    const suggestions = [];

    // Suggest complementary materials
    if (category === 'countertops') {
      suggestions.push('Consider matching backsplash tiles');
      suggestions.push('Request edge profile options');
    } else if (category === 'tile') {
      suggestions.push('Check available trim pieces and bullnose');
      suggestions.push('Calculate 10% overage for cuts and waste');
    } else if (category === 'flooring') {
      suggestions.push('Consider transition strips for doorways');
      suggestions.push('Check underlayment requirements');
    }

    // Suggest local pickup if local results found
    if (results.some(r => r.isLocal)) {
      suggestions.push('Local pickup available from Miami suppliers');
    }

    return suggestions;
  }

  /**
   * Clean up product name
   */
  cleanProductName(name) {
    return name
      .replace(/\s*[-|]\s*(MSI|Daltile|Home Depot|Lowe's|Floor & Decor).*/i, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  /**
   * Compare materials side by side
   */
  async compareMaterials(products) {
    if (!products || products.length < 2) {
      return {
        success: false,
        error: 'Need at least 2 products to compare'
      };
    }

    const comparison = {
      products: products.map(p => ({
        name: p.name,
        supplier: p.supplier,
        price: p.price,
        imageUrl: p.imageUrl,
        isLocal: p.isLocal
      })),
      factors: {
        price: this.analyzePriceDifferences(products),
        availability: products.map(p => ({
          name: p.name,
          local: p.isLocal,
          supplier: p.supplier
        }))
      }
    };

    return {
      success: true,
      comparison,
      action: 'material_comparison',
      uiAction: {
        type: 'show_comparison',
        data: comparison
      }
    };
  }

  /**
   * Analyze price differences between products
   */
  analyzePriceDifferences(products) {
    const withPrices = products.filter(p => p.price);
    if (withPrices.length < 2) {
      return { available: false, note: 'Insufficient price data for comparison' };
    }

    const prices = withPrices.map(p => parseFloat(p.price.replace(/[$,]/g, '')));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const diff = ((max - min) / min * 100).toFixed(0);

    return {
      available: true,
      range: `$${min.toFixed(2)} - $${max.toFixed(2)}`,
      difference: `${diff}% price difference`,
      cheapest: withPrices.find(p => parseFloat(p.price.replace(/[$,]/g, '')) === min)?.name
    };
  }

  /**
   * Create a moodboard/collection from selected materials
   */
  async createMoodboard(materials, options = {}) {
    const { name = 'Project Moodboard', projectId = null, style = null } = options;

    const moodboard = {
      id: Date.now().toString(),
      name,
      projectId,
      style,
      createdAt: new Date(),
      materials: materials.map(m => ({
        name: m.name,
        imageUrl: m.imageUrl,
        supplier: m.supplier,
        price: m.price,
        category: m.category
      }))
    };

    return {
      success: true,
      moodboard,
      action: 'moodboard_created',
      message: `Created moodboard "${name}" with ${materials.length} materials`,
      uiAction: {
        type: 'show_moodboard',
        data: moodboard
      }
    };
  }

  /**
   * Estimate materials needed for a project
   */
  async estimateMaterials(projectDetails) {
    const {
      type, // 'kitchen_remodel', 'bathroom', 'flooring', etc.
      dimensions = {},
      materials = []
    } = projectDetails;

    const estimates = [];

    // Calculate based on project type
    if (type === 'kitchen_remodel' || type === 'countertops') {
      const countertopSqft = dimensions.countertopLength * 2; // Assuming 2ft depth
      estimates.push({
        item: 'Countertop Material',
        quantity: countertopSqft,
        unit: 'sq ft',
        note: 'Add 10% for cutouts and waste'
      });
    }

    if (type === 'flooring' || dimensions.floorSqft) {
      const floorSqft = dimensions.floorSqft || (dimensions.length * dimensions.width);
      estimates.push({
        item: 'Flooring Material',
        quantity: Math.ceil(floorSqft * 1.1), // 10% overage
        unit: 'sq ft',
        note: 'Includes 10% overage for cuts'
      });
    }

    if (type === 'backsplash' || dimensions.backsplashSqft) {
      const backsplashSqft = dimensions.backsplashSqft || 30; // Default estimate
      estimates.push({
        item: 'Backsplash Tile',
        quantity: Math.ceil(backsplashSqft * 1.15), // 15% overage for tile
        unit: 'sq ft',
        note: 'Includes 15% overage for cuts and waste'
      });
    }

    return {
      success: true,
      projectType: type,
      estimates,
      action: 'material_estimate',
      message: `Estimated materials for ${type}: ${estimates.map(e => `${e.quantity} ${e.unit} ${e.item}`).join(', ')}`
    };
  }

  /**
   * Get supplier contact info for ordering
   */
  getSupplierContact(supplierKey) {
    const supplier = this.suppliers[supplierKey] ||
                     Object.values(this.suppliers).find(s =>
                       s.name.toLowerCase().includes(supplierKey.toLowerCase())
                     );

    if (!supplier) {
      return { success: false, error: 'Supplier not found' };
    }

    return {
      success: true,
      supplier: {
        name: supplier.name,
        website: supplier.website,
        type: supplier.type,
        local: supplier.local,
        region: supplier.region,
        specialties: supplier.specialties,
        priceRange: supplier.priceRange,
        contact: supplier.contactInfo
      }
    };
  }
}

export default new MaterialSourcingService();
