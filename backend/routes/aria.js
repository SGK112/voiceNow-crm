import express from 'express';
import OpenAI from 'openai';
import axios from 'axios';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import ttsService from '../services/ttsService.js';
import networkDiscoveryService from '../services/networkDiscoveryService.js';
import translationService from '../services/translationService.js';

const router = express.Router();

// Configure multer for audio file uploads
const audioUpload = multer({
  dest: 'uploads/audio/',
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/m4a', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(m4a|mp3|wav|webm|ogg|mp4)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio file type'), false);
    }
  }
});
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Network device action tools for function calling
const NETWORK_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'discover_network_devices',
      description: 'Scan the local network to discover all connected devices like computers, printers, speakers, smart home devices, etc.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_network_devices',
      description: 'Get the list of previously discovered network devices',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Filter by device type: printer, speaker, computer, smartTV, smartHome, nas, camera, router' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'wake_device',
      description: 'Wake up a computer or device using Wake-on-LAN',
      parameters: {
        type: 'object',
        properties: {
          ip: { type: 'string', description: 'IP address of the device to wake' },
          mac: { type: 'string', description: 'MAC address of the device (optional if IP is known)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'control_speaker',
      description: 'Control a Sonos or network speaker - play, pause, stop, skip, set volume',
      parameters: {
        type: 'object',
        properties: {
          ip: { type: 'string', description: 'IP address of the speaker' },
          action: { type: 'string', enum: ['play', 'pause', 'stop', 'next', 'previous', 'setVolume', 'getVolume'], description: 'Action to perform' },
          volume: { type: 'number', description: 'Volume level 0-100 (only for setVolume action)' },
        },
        required: ['ip', 'action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'print_document',
      description: 'Send text or a document to a network printer',
      parameters: {
        type: 'object',
        properties: {
          ip: { type: 'string', description: 'IP address of the printer' },
          content: { type: 'string', description: 'Text content to print' },
        },
        required: ['ip', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'device_http_request',
      description: 'Make an HTTP request to a network device (for smart home devices, APIs, etc.)',
      parameters: {
        type: 'object',
        properties: {
          ip: { type: 'string', description: 'IP address of the device' },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], description: 'HTTP method' },
          path: { type: 'string', description: 'URL path (e.g., /api/state)' },
          port: { type: 'number', description: 'Port number (default: 80)' },
          data: { type: 'object', description: 'Request body for POST/PUT' },
        },
        required: ['ip'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ping_device',
      description: 'Check if a network device is online and responding',
      parameters: {
        type: 'object',
        properties: { ip: { type: 'string', description: 'IP address of the device to ping' } },
        required: ['ip'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_device_info',
      description: 'Get detailed information about a specific network device',
      parameters: {
        type: 'object',
        properties: { ip: { type: 'string', description: 'IP address of the device' } },
        required: ['ip'],
      },
    },
  },
];

// Execute network tool calls
async function executeNetworkTool(toolName, args) {
  console.log(`[Aria] Executing network tool: ${toolName}`, args);
  try {
    switch (toolName) {
      case 'discover_network_devices': {
        const result = await networkDiscoveryService.discoverDevices();
        if (result.success) {
          return {
            success: true,
            message: `Found ${result.count} devices on the network`,
            devices: result.devices.map(d => ({
              ip: d.ip, hostname: d.hostname, type: d.type, vendor: d.vendor, capabilities: d.capabilities, mac: d.mac,
            })),
          };
        }
        return { success: false, error: result.error };
      }
      case 'list_network_devices': {
        let devices = networkDiscoveryService.getCachedDevices();
        if (args.type) devices = devices.filter(d => d.type === args.type.toLowerCase());
        return {
          success: true, count: devices.length,
          devices: devices.map(d => ({ ip: d.ip, hostname: d.hostname, type: d.type, vendor: d.vendor, capabilities: d.capabilities, online: d.online })),
        };
      }
      case 'wake_device': {
        const device = args.mac ? null : networkDiscoveryService.getDevice(args.ip);
        const mac = args.mac || device?.mac;
        if (!mac) return { success: false, error: 'MAC address required. Run device discovery first.' };
        return await networkDiscoveryService.wakeOnLan(mac);
      }
      case 'control_speaker': {
        return await networkDiscoveryService.controlSonos(args.ip, args.action, { volume: args.volume });
      }
      case 'print_document': {
        return await networkDiscoveryService.printToDevice(args.ip, args.content);
      }
      case 'device_http_request': {
        return await networkDiscoveryService.httpRequest(args.ip, {
          method: args.method || 'GET', path: args.path || '/', port: args.port || 80, data: args.data,
        });
      }
      case 'ping_device': {
        const result = await networkDiscoveryService.pingHost(args.ip);
        return { success: true, ip: args.ip, online: result.alive, latency: result.latency };
      }
      case 'get_device_info': {
        let device = networkDiscoveryService.getDevice(args.ip);
        if (!device) {
          const openPorts = await networkDiscoveryService.scanPorts(args.ip);
          if (openPorts.length > 0) {
            device = {
              ip: args.ip, openPorts,
              type: networkDiscoveryService.identifyDeviceType({ openPorts }),
              capabilities: networkDiscoveryService.getDeviceCapabilities({ openPorts }),
            };
          }
        }
        return device ? { success: true, device } : { success: false, error: 'Device not found or offline' };
      }
      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    console.error(`[Aria] Network tool error (${toolName}):`, error);
    return { success: false, error: error.message };
  }
}

// Detect if message is about network/IoT devices
function detectNetworkIntent(message) {
  const networkKeywords = [
    'network', 'device', 'devices', 'scan', 'discover', 'printer', 'print',
    'speaker', 'sonos', 'volume', 'play', 'pause', 'computer', 'wake up',
    'wake on lan', 'wol', 'smart home', 'iot', 'connected', 'ip address',
    'ping', 'online', 'offline', 'cast', 'chromecast', 'airplay', 'nas',
    'camera', 'tv', 'television', 'router', 'hue', 'lights', 'thermostat',
  ];
  const lower = message.toLowerCase();
  return networkKeywords.some(kw => lower.includes(kw));
}

// Location-aware tools for function calling
const LOCATION_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'location_search',
      description: 'Search for information based on a location. Use this when the user asks about places, businesses, services, or anything location-specific.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'What to search for (e.g., "best pizza", "plumber", "gas station")' },
          latitude: { type: 'number', description: 'User\'s latitude coordinate' },
          longitude: { type: 'number', description: 'User\'s longitude coordinate' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_nearby',
      description: 'Find nearby places like restaurants, stores, services, attractions',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Type of place (restaurant, gas_station, pharmacy, hospital, etc.)' },
          keyword: { type: 'string', description: 'Additional keyword to filter results' },
          latitude: { type: 'number', description: 'Latitude coordinate' },
          longitude: { type: 'number', description: 'Longitude coordinate' },
        },
        required: ['latitude', 'longitude'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get current weather for a location',
      parameters: {
        type: 'object',
        properties: {
          latitude: { type: 'number', description: 'Latitude coordinate' },
          longitude: { type: 'number', description: 'Longitude coordinate' },
        },
        required: ['latitude', 'longitude'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_location_info',
      description: 'Get information about a location from coordinates (city, state, neighborhood)',
      parameters: {
        type: 'object',
        properties: {
          latitude: { type: 'number', description: 'Latitude coordinate' },
          longitude: { type: 'number', description: 'Longitude coordinate' },
        },
        required: ['latitude', 'longitude'],
      },
    },
  },
];

// Execute location tool calls
async function executeLocationTool(toolName, args) {
  console.log(`[Aria] Executing location tool: ${toolName}`, args);
  try {
    switch (toolName) {
      case 'location_search': {
        const response = await axios.post('http://localhost:5001/api/scraper/location-search', {
          query: args.query,
          latitude: args.latitude,
          longitude: args.longitude,
        });
        return response.data;
      }
      case 'find_nearby': {
        const response = await axios.post('http://localhost:5001/api/scraper/nearby', {
          latitude: args.latitude,
          longitude: args.longitude,
          type: args.type,
          keyword: args.keyword,
        });
        return response.data;
      }
      case 'get_weather': {
        const response = await axios.post('http://localhost:5001/api/scraper/weather', {
          latitude: args.latitude,
          longitude: args.longitude,
        });
        return response.data;
      }
      case 'get_location_info': {
        const response = await axios.post('http://localhost:5001/api/scraper/geocode', {
          latitude: args.latitude,
          longitude: args.longitude,
        });
        return response.data;
      }
      default:
        return { success: false, error: `Unknown location tool: ${toolName}` };
    }
  } catch (error) {
    console.error(`[Aria] Location tool error (${toolName}):`, error.message);
    return { success: false, error: error.message };
  }
}

// Detect if message needs location-based search
function detectLocationIntent(message) {
  const locationKeywords = [
    'near me', 'nearby', 'close by', 'around here', 'in my area',
    'weather', 'temperature', 'forecast', 'raining', 'sunny',
    'where am i', 'my location', 'current location',
    'restaurant', 'food', 'eat', 'coffee', 'cafe', 'bar',
    'gas station', 'pharmacy', 'hospital', 'doctor', 'dentist',
    'store', 'shop', 'mall', 'grocery', 'supermarket',
    'hotel', 'motel', 'lodging', 'parking', 'atm', 'bank',
    'directions', 'how far', 'distance to',
    'find', 'looking for', 'search for', 'where can i',
  ];
  const lower = message.toLowerCase();
  return locationKeywords.some(kw => lower.includes(kw));
}

// Translation tools for function calling
const TRANSLATION_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'translate_text',
      description: 'Translate text from one language to another. Use this when the user asks to translate something or wants to communicate in a different language.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The text to translate' },
          targetLanguage: { type: 'string', description: 'Target language code (e.g., es, fr, de, zh, ja, ko, ar, hi, ru, pt)' },
          sourceLanguage: { type: 'string', description: 'Source language code (optional, defaults to auto-detect)' },
          context: { type: 'string', description: 'Additional context for better translation (e.g., business, casual, formal)' },
        },
        required: ['text', 'targetLanguage'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'detect_language',
      description: 'Detect the language of a given text',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The text to analyze for language detection' },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'batch_translate',
      description: 'Translate multiple texts at once to a target language',
      parameters: {
        type: 'object',
        properties: {
          texts: { type: 'array', items: { type: 'string' }, description: 'Array of texts to translate' },
          targetLanguage: { type: 'string', description: 'Target language code' },
          sourceLanguage: { type: 'string', description: 'Source language code (optional)' },
        },
        required: ['texts', 'targetLanguage'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'translate_conversation',
      description: 'Translate a conversation thread or multiple messages to a target language',
      parameters: {
        type: 'object',
        properties: {
          messages: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                content: { type: 'string' },
                language: { type: 'string' },
                sender: { type: 'string' },
              },
            },
            description: 'Array of messages to translate',
          },
          targetLanguage: { type: 'string', description: 'Target language code' },
        },
        required: ['messages', 'targetLanguage'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_translation_history',
      description: 'Get translation history for a user, optionally filtered by language or contact',
      parameters: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User ID to get history for' },
          limit: { type: 'number', description: 'Maximum number of records to return' },
          language: { type: 'string', description: 'Filter by language code' },
          contactId: { type: 'string', description: 'Filter by contact ID' },
        },
        required: ['userId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_language_profile',
      description: 'Set language preferences for a contact or user (preferred language, native language, other languages they speak)',
      parameters: {
        type: 'object',
        properties: {
          entityId: { type: 'string', description: 'Contact or user ID' },
          entityType: { type: 'string', enum: ['contact', 'user'], description: 'Whether this is a contact or user' },
          preferredLanguage: { type: 'string', description: 'Preferred language code for communication' },
          nativeLanguage: { type: 'string', description: 'Native/first language code' },
          otherLanguages: { type: 'array', items: { type: 'string' }, description: 'Other languages they speak' },
          notes: { type: 'string', description: 'Additional notes about language preferences' },
        },
        required: ['entityId', 'entityType'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_language_profile',
      description: 'Get language profile/preferences for a contact or user',
      parameters: {
        type: 'object',
        properties: {
          entityId: { type: 'string', description: 'Contact or user ID' },
          entityType: { type: 'string', enum: ['contact', 'user'], description: 'Whether this is a contact or user' },
        },
        required: ['entityId', 'entityType'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_supported_languages',
      description: 'Get list of all supported languages for translation',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'suggest_translation',
      description: 'Get translation suggestions based on context, target audience, and purpose',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to analyze for translation suggestions' },
          targetAudience: { type: 'string', description: 'Who will read this (e.g., business clients, friends, general public)' },
          purpose: { type: 'string', description: 'Purpose of the translation (e.g., marketing, legal, casual chat)' },
          tone: { type: 'string', description: 'Desired tone (formal, casual, friendly, professional)' },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_translation_stats',
      description: 'Get translation usage statistics for a user, including most used languages and language pairs',
      parameters: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User ID to get stats for' },
        },
        required: ['userId'],
      },
    },
  },
];

// Execute translation tool calls
async function executeTranslationTool(toolName, args, userId) {
  console.log(`[Aria] Executing translation tool: ${toolName}`, args);
  try {
    switch (toolName) {
      case 'translate_text': {
        const result = await translationService.translate(
          args.text,
          args.targetLanguage,
          args.sourceLanguage || 'auto',
          { userId, context: args.context }
        );
        return result;
      }
      case 'detect_language': {
        const languageCode = await translationService.detectLanguage(args.text);
        const languageInfo = translationService.getSupportedLanguages().find(l => l.code === languageCode);
        return {
          success: true,
          language: languageCode,
          name: languageInfo?.name || languageCode,
          nativeName: languageInfo?.nativeName || languageCode,
        };
      }
      case 'batch_translate': {
        return await translationService.batchTranslate(
          args.texts,
          args.targetLanguage,
          args.sourceLanguage || 'auto',
          { userId }
        );
      }
      case 'translate_conversation': {
        return await translationService.translateConversation(
          args.messages,
          args.targetLanguage,
          { userId }
        );
      }
      case 'get_translation_history': {
        return translationService.getHistory(args.userId, {
          limit: args.limit,
          language: args.language,
          contactId: args.contactId,
        });
      }
      case 'set_language_profile': {
        return translationService.setLanguageProfile(args.entityId, args.entityType, {
          preferredLanguage: args.preferredLanguage,
          nativeLanguage: args.nativeLanguage,
          otherLanguages: args.otherLanguages || [],
          notes: args.notes,
        });
      }
      case 'get_language_profile': {
        const profile = translationService.getLanguageProfile(args.entityId, args.entityType);
        return profile
          ? { success: true, profile }
          : { success: false, error: 'No language profile found' };
      }
      case 'get_supported_languages': {
        const languages = translationService.getSupportedLanguages();
        return { success: true, languages, count: languages.length };
      }
      case 'suggest_translation': {
        return await translationService.suggestTranslation(args.text, {
          targetAudience: args.targetAudience,
          purpose: args.purpose,
          tone: args.tone,
        });
      }
      case 'get_translation_stats': {
        const stats = translationService.getLanguageStats(args.userId);
        return { success: true, stats };
      }
      default:
        return { success: false, error: `Unknown translation tool: ${toolName}` };
    }
  } catch (error) {
    console.error(`[Aria] Translation tool error (${toolName}):`, error);
    return { success: false, error: error.message };
  }
}

// Detect if message involves translation or language-related requests
function detectTranslationIntent(message) {
  const translationKeywords = [
    'translate', 'translation', 'translator', 'interpret',
    'say in', 'how do you say', 'what does', 'mean in',
    'in spanish', 'in french', 'in german', 'in chinese', 'in japanese',
    'in korean', 'in arabic', 'in hindi', 'in russian', 'in portuguese',
    'in italian', 'in dutch', 'in turkish', 'in polish', 'in vietnamese',
    'in thai', 'in swedish', 'in hebrew',
    'en español', 'en français', 'auf deutsch', '中文', '日本語', '한국어',
    'language profile', 'speaks', 'language preference', 'native language',
    'translation history', 'what languages', 'supported languages',
    'convert to', 'change to', 'localize', 'multilingual',
  ];
  const lower = message.toLowerCase();
  return translationKeywords.some(kw => lower.includes(kw));
}

// Language and dialect detection patterns
const LANGUAGE_PATTERNS = {
  // Spanish variants
  'es-MX': { // Mexican Spanish
    patterns: [/\b(órale|chido|padre|mande|güey|neta|chale|ándale|híjole|qué onda)\b/i],
    name: 'Spanish (Mexico)',
    nativeName: 'Español (México)',
    baseLanguage: 'es',
  },
  'es-ES': { // Castilian Spanish
    patterns: [/\b(vale|tío|mola|guay|flipar|currar|quedada|coño|hostia|joder)\b/i],
    name: 'Spanish (Spain)',
    nativeName: 'Español (España)',
    baseLanguage: 'es',
  },
  'es-AR': { // Argentine Spanish
    patterns: [/\b(che|boludo|quilombo|laburo|afanar|morfar|bondi|mango|pibe|vos sos)\b/i, /\bvos\s+(sos|tenés|querés|podés)\b/i],
    name: 'Spanish (Argentina)',
    nativeName: 'Español (Argentina)',
    baseLanguage: 'es',
  },
  'es-CO': { // Colombian Spanish
    patterns: [/\b(parce|parcero|bacano|chimba|berraco|marica|sumercé|paila)\b/i],
    name: 'Spanish (Colombia)',
    nativeName: 'Español (Colombia)',
    baseLanguage: 'es',
  },

  // Portuguese variants
  'pt-BR': { // Brazilian Portuguese
    patterns: [/\b(legal|cara|gente|beleza|tchau|né|oi|valeu|massa|show|tipo assim)\b/i],
    name: 'Portuguese (Brazil)',
    nativeName: 'Português (Brasil)',
    baseLanguage: 'pt',
  },
  'pt-PT': { // European Portuguese
    patterns: [/\b(pá|fixe|gajo|miúdo|bué|chavalo|giro|betinho)\b/i],
    name: 'Portuguese (Portugal)',
    nativeName: 'Português (Portugal)',
    baseLanguage: 'pt',
  },

  // English variants
  'en-US': { // American English
    patterns: [/\b(y'all|gonna|wanna|gotta|awesome|dude|bro|trash|gas|apartment|elevator|soccer)\b/i],
    name: 'English (US)',
    nativeName: 'English (US)',
    baseLanguage: 'en',
  },
  'en-GB': { // British English
    patterns: [/\b(bloody|brilliant|bloke|mate|cheers|rubbish|flat|lift|lorry|football|quid|innit)\b/i],
    name: 'English (UK)',
    nativeName: 'English (UK)',
    baseLanguage: 'en',
  },
  'en-AU': { // Australian English
    patterns: [/\b(arvo|brekkie|g'day|heaps|reckon|servo|sunnies|thongs|ute|straya|crikey|barbie)\b/i],
    name: 'English (Australia)',
    nativeName: 'English (Australia)',
    baseLanguage: 'en',
  },

  // French variants
  'fr-CA': { // Canadian French
    patterns: [/\b(icitte|pantoute|char|blonde|chum|tabarnac|câlice|crisse|tu-suite|magasiner)\b/i],
    name: 'French (Canada)',
    nativeName: 'Français (Canada)',
    baseLanguage: 'fr',
  },
  'fr-FR': { // Metropolitan French
    patterns: [/\b(mec|meuf|kiffer|ouf|chelou|vénère|relou|chanmé|daron)\b/i],
    name: 'French (France)',
    nativeName: 'Français (France)',
    baseLanguage: 'fr',
  },

  // Chinese variants
  'zh-CN': { // Simplified Chinese (Mainland)
    patterns: [/[\u4e00-\u9fff]/, /\b(厉害|牛逼|靠谱|给力|吐槽|宅|萌|坑爹)\b/],
    name: 'Chinese (Simplified)',
    nativeName: '简体中文',
    baseLanguage: 'zh',
  },
  'zh-TW': { // Traditional Chinese (Taiwan)
    patterns: [/[\u4e00-\u9fff].*[機車電腦網路]/],
    name: 'Chinese (Traditional)',
    nativeName: '繁體中文',
    baseLanguage: 'zh',
  },
  'zh-HK': { // Cantonese (Hong Kong)
    patterns: [/\b(係|唔係|咩|嘅|啲|冇|佢|嗰|點解|乜嘢)\b/],
    name: 'Cantonese (Hong Kong)',
    nativeName: '粵語 (香港)',
    baseLanguage: 'zh',
  },

  // Arabic variants
  'ar-EG': { // Egyptian Arabic
    patterns: [/\b(ازيك|إزيك|ايه|إيه|كده|بتاع|عايز|مش|ليه)\b/],
    name: 'Arabic (Egypt)',
    nativeName: 'العربية (مصر)',
    baseLanguage: 'ar',
  },
  'ar-SA': { // Saudi Arabic (Gulf)
    patterns: [/\b(وش|كيفك|زين|حلو|يعني|والله|إن شاء الله|مشاء الله)\b/],
    name: 'Arabic (Saudi)',
    nativeName: 'العربية (السعودية)',
    baseLanguage: 'ar',
  },
  'ar-MA': { // Moroccan Arabic (Darija)
    patterns: [/\b(لاباس|واخا|بزاف|شنو|فين|كيفاش|علاش)\b/],
    name: 'Arabic (Morocco)',
    nativeName: 'الدارجة المغربية',
    baseLanguage: 'ar',
  },

  // German variants
  'de-DE': { // Standard German
    patterns: [/\b(geil|krass|hammer|mega|echt|genau|doch|na ja)\b/i],
    name: 'German (Germany)',
    nativeName: 'Deutsch (Deutschland)',
    baseLanguage: 'de',
  },
  'de-AT': { // Austrian German
    patterns: [/\b(servus|grüß gott|leiwand|gspusi|baba|oida|habedere)\b/i],
    name: 'German (Austria)',
    nativeName: 'Deutsch (Österreich)',
    baseLanguage: 'de',
  },
  'de-CH': { // Swiss German
    patterns: [/\b(grüezi|merci|sali|hoi|guete|gäll|ciao zäme)\b/i],
    name: 'German (Switzerland)',
    nativeName: 'Schweizerdeutsch',
    baseLanguage: 'de',
  },

  // Base languages (for detection when no dialect markers found)
  'es': {
    patterns: [/[áéíóúñ¿¡]/i, /\b(qué|cómo|dónde|cuándo|por qué|hola|gracias|buenos días)\b/i],
    name: 'Spanish',
    nativeName: 'Español',
    baseLanguage: 'es',
  },
  'fr': {
    patterns: [/[àâçéèêëîïôùûü]/i, /\b(bonjour|merci|s'il vous plaît|je suis|c'est|qu'est-ce)\b/i],
    name: 'French',
    nativeName: 'Français',
    baseLanguage: 'fr',
  },
  'de': {
    patterns: [/[äöüß]/i, /\b(ich|bin|ist|das|und|nicht|hallo|danke|bitte)\b/i],
    name: 'German',
    nativeName: 'Deutsch',
    baseLanguage: 'de',
  },
  'it': {
    patterns: [/[àèéìòù]/i, /\b(ciao|grazie|prego|buongiorno|come stai|sono|questo)\b/i],
    name: 'Italian',
    nativeName: 'Italiano',
    baseLanguage: 'it',
  },
  'pt': {
    patterns: [/[ãõáàâéêíóôú]/i, /\b(olá|obrigado|bom dia|como vai|estou|você)\b/i],
    name: 'Portuguese',
    nativeName: 'Português',
    baseLanguage: 'pt',
  },
  'ja': {
    patterns: [/[\u3040-\u309f\u30a0-\u30ff]/, /[\u4e00-\u9faf]/],
    name: 'Japanese',
    nativeName: '日本語',
    baseLanguage: 'ja',
  },
  'ko': {
    patterns: [/[\uac00-\ud7af\u1100-\u11ff]/],
    name: 'Korean',
    nativeName: '한국어',
    baseLanguage: 'ko',
  },
  'zh': {
    patterns: [/[\u4e00-\u9fff]/],
    name: 'Chinese',
    nativeName: '中文',
    baseLanguage: 'zh',
  },
  'ar': {
    patterns: [/[\u0600-\u06ff]/],
    name: 'Arabic',
    nativeName: 'العربية',
    baseLanguage: 'ar',
  },
  'hi': {
    patterns: [/[\u0900-\u097f]/],
    name: 'Hindi',
    nativeName: 'हिन्दी',
    baseLanguage: 'hi',
  },
  'ru': {
    patterns: [/[\u0400-\u04ff]/i, /\b(привет|спасибо|пожалуйста|как дела|я|это)\b/i],
    name: 'Russian',
    nativeName: 'Русский',
    baseLanguage: 'ru',
  },
  'vi': {
    patterns: [/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i],
    name: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    baseLanguage: 'vi',
  },
  'th': {
    patterns: [/[\u0e00-\u0e7f]/],
    name: 'Thai',
    nativeName: 'ไทย',
    baseLanguage: 'th',
  },
  'nl': {
    patterns: [/\b(hallo|dank je|alsjeblieft|goedemorgen|hoe gaat het|ik ben)\b/i],
    name: 'Dutch',
    nativeName: 'Nederlands',
    baseLanguage: 'nl',
  },
  'tr': {
    patterns: [/[çğıöşü]/i, /\b(merhaba|teşekkürler|nasılsın|ben|evet|hayır)\b/i],
    name: 'Turkish',
    nativeName: 'Türkçe',
    baseLanguage: 'tr',
  },
  'pl': {
    patterns: [/[ąćęłńóśźż]/i, /\b(cześć|dziękuję|proszę|jak się masz|jestem)\b/i],
    name: 'Polish',
    nativeName: 'Polski',
    baseLanguage: 'pl',
  },
  'he': {
    patterns: [/[\u0590-\u05ff]/],
    name: 'Hebrew',
    nativeName: 'עברית',
    baseLanguage: 'he',
  },
  'sv': {
    patterns: [/[åäö]/i, /\b(hej|tack|snälla|hur mår du|jag är)\b/i],
    name: 'Swedish',
    nativeName: 'Svenska',
    baseLanguage: 'sv',
  },
};

/**
 * Detect language and dialect from text
 * Returns { code, name, nativeName, baseLanguage, confidence }
 */
function detectLanguageAndDialect(text) {
  if (!text || typeof text !== 'string') {
    return { code: 'en', name: 'English', nativeName: 'English', baseLanguage: 'en', confidence: 0 };
  }

  const results = [];

  // Check dialect patterns first (more specific)
  const dialectCodes = ['es-MX', 'es-ES', 'es-AR', 'es-CO', 'pt-BR', 'pt-PT', 'en-US', 'en-GB', 'en-AU',
                        'fr-CA', 'fr-FR', 'zh-CN', 'zh-TW', 'zh-HK', 'ar-EG', 'ar-SA', 'ar-MA',
                        'de-DE', 'de-AT', 'de-CH'];

  for (const code of dialectCodes) {
    const lang = LANGUAGE_PATTERNS[code];
    if (lang && lang.patterns) {
      for (const pattern of lang.patterns) {
        const matches = text.match(pattern);
        if (matches) {
          results.push({
            code,
            name: lang.name,
            nativeName: lang.nativeName,
            baseLanguage: lang.baseLanguage,
            confidence: 0.9,
            matchCount: matches.length,
          });
        }
      }
    }
  }

  // Check base language patterns
  const baseLangCodes = ['es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'ar', 'hi', 'ru', 'vi', 'th', 'nl', 'tr', 'pl', 'he', 'sv'];

  for (const code of baseLangCodes) {
    const lang = LANGUAGE_PATTERNS[code];
    if (lang && lang.patterns) {
      for (const pattern of lang.patterns) {
        if (pattern.test(text)) {
          // Only add if we don't already have a dialect match for this base language
          const hasDialectMatch = results.some(r => r.baseLanguage === code);
          if (!hasDialectMatch) {
            results.push({
              code,
              name: lang.name,
              nativeName: lang.nativeName,
              baseLanguage: lang.baseLanguage,
              confidence: 0.7,
            });
          }
        }
      }
    }
  }

  // Sort by confidence and match count
  results.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return (b.matchCount || 0) - (a.matchCount || 0);
  });

  // Return best match or default to English
  if (results.length > 0) {
    return results[0];
  }

  // Default to English if no patterns matched (likely English text)
  return { code: 'en', name: 'English', nativeName: 'English', baseLanguage: 'en', confidence: 0.5 };
}

// Multilingual personalized greeting templates - {name} will be replaced with user's name
// Organized by language for easy expansion
const MULTILINGUAL_GREETINGS = {
  en: [ // English
    "Hey {name}! What can I help you with?",
    "Hi {name}! I'm listening.",
    "Hello {name}! Go ahead.",
    "Hey {name}! What's up?",
    "Yes {name}? I'm ready.",
    "Hi {name}! I'm all ears.",
    "Hey {name}! How can I help?",
    "What can I do for you, {name}?",
    "Hi {name}! Ask me anything.",
    "Hello {name}! I'm here for you.",
    "Hey {name}! Ready to help.",
    "Hi {name}! What's on your mind?",
  ],
  es: [ // Spanish
    "¡Hola {name}! ¿En qué puedo ayudarte?",
    "¡Hola {name}! Te escucho.",
    "¡{name}! ¿Qué necesitas?",
    "¡Hola {name}! Adelante.",
    "¿Qué tal {name}? Estoy lista.",
    "¡Hola {name}! ¿Cómo puedo ayudarte?",
    "¡{name}! Dime.",
    "¿Sí {name}? Te escucho.",
    "¡Hola {name}! ¿Qué puedo hacer por ti?",
    "¡Hola {name}! Estoy aquí para ayudarte.",
  ],
  fr: [ // French
    "Salut {name} ! Comment puis-je t'aider ?",
    "Bonjour {name} ! Je t'écoute.",
    "{name} ! Que puis-je faire pour toi ?",
    "Oui {name} ? Je suis prête.",
    "Salut {name} ! Dis-moi tout.",
    "Bonjour {name} ! Je suis à ton écoute.",
    "Coucou {name} ! Comment puis-je aider ?",
    "{name} ! Je suis là.",
    "Bonjour {name} ! Qu'est-ce que je peux faire ?",
    "Salut {name} ! Je suis prête à t'aider.",
  ],
  de: [ // German
    "Hallo {name}! Wie kann ich dir helfen?",
    "Hi {name}! Ich höre zu.",
    "{name}! Was brauchst du?",
    "Ja {name}? Ich bin bereit.",
    "Hallo {name}! Was kann ich für dich tun?",
    "Hey {name}! Schieß los.",
    "Hallo {name}! Ich bin ganz Ohr.",
    "{name}! Wie kann ich helfen?",
    "Hi {name}! Was liegt dir auf dem Herzen?",
    "Hallo {name}! Ich bin hier für dich.",
  ],
  it: [ // Italian
    "Ciao {name}! Come posso aiutarti?",
    "Ehi {name}! Ti ascolto.",
    "{name}! Cosa ti serve?",
    "Sì {name}? Sono pronta.",
    "Ciao {name}! Dimmi pure.",
    "Ciao {name}! Sono tutta orecchi.",
    "{name}! Come posso essere utile?",
    "Ciao {name}! Sono qui per te.",
    "Ehi {name}! Di cosa hai bisogno?",
    "Ciao {name}! Cosa posso fare per te?",
  ],
  pt: [ // Portuguese
    "Olá {name}! Como posso ajudar?",
    "Oi {name}! Estou ouvindo.",
    "{name}! O que você precisa?",
    "Sim {name}? Estou pronta.",
    "Olá {name}! Pode falar.",
    "E aí {name}! Como posso ajudar?",
    "Oi {name}! Estou aqui para você.",
    "{name}! Diga-me.",
    "Olá {name}! O que posso fazer por você?",
    "Oi {name}! Estou à disposição.",
  ],
  zh: [ // Chinese (Simplified)
    "{name}，你好！有什么我可以帮你的？",
    "{name}，我在听。",
    "你好{name}！请说。",
    "{name}，需要什么帮助？",
    "好的{name}，我准备好了。",
    "嗨{name}！怎么帮你？",
    "{name}，有什么事吗？",
    "你好{name}！我来帮你。",
    "{name}，请问有什么需要？",
    "好的{name}！请说。",
  ],
  ja: [ // Japanese
    "{name}さん、こんにちは！何かお手伝いしましょうか？",
    "{name}さん、聞いていますよ。",
    "はい{name}さん、どうぞ。",
    "{name}さん、何でしょう？",
    "こんにちは{name}さん！お手伝いします。",
    "{name}さん、何かありますか？",
    "はい{name}さん、準備できています。",
    "{name}さん、お話しください。",
    "こんにちは{name}さん！どうしましたか？",
    "{name}さん、聞いています。",
  ],
  ko: [ // Korean
    "{name}님, 안녕하세요! 무엇을 도와드릴까요?",
    "{name}님, 듣고 있어요.",
    "네 {name}님, 말씀하세요.",
    "{name}님, 무엇이 필요하세요?",
    "안녕하세요 {name}님! 도와드릴게요.",
    "{name}님, 준비됐어요.",
    "네 {name}님, 어떻게 도와드릴까요?",
    "{name}님, 말씀해 주세요.",
    "안녕하세요 {name}님! 뭘 도와드릴까요?",
    "{name}님, 여기 있어요.",
  ],
  ar: [ // Arabic
    "مرحباً {name}! كيف أقدر أساعدك؟",
    "أهلاً {name}! أنا أسمعك.",
    "نعم {name}؟ أنا جاهزة.",
    "مرحباً {name}! تفضل.",
    "{name}، ماذا تحتاج؟",
    "أهلاً {name}! كيف أقدر أخدمك؟",
    "مرحباً {name}! أنا هنا لمساعدتك.",
    "{name}، قل لي.",
    "أهلاً {name}! ماذا أقدر أفعل لك؟",
    "مرحباً {name}! جاهزة للمساعدة.",
  ],
  hi: [ // Hindi
    "नमस्ते {name}! मैं कैसे मदद कर सकती हूं?",
    "हाय {name}! मैं सुन रही हूं।",
    "हां {name}? बताइए।",
    "नमस्ते {name}! क्या चाहिए?",
    "{name}, कैसे मदद करूं?",
    "हैलो {name}! मैं यहां हूं।",
    "{name}, बोलिए।",
    "नमस्ते {name}! आपकी सेवा में।",
    "हाय {name}! क्या मदद चाहिए?",
    "{name}, मैं तैयार हूं।",
  ],
  ru: [ // Russian
    "Привет {name}! Чем могу помочь?",
    "Да {name}? Слушаю.",
    "Привет {name}! Говори.",
    "{name}, что нужно?",
    "Здравствуй {name}! Как помочь?",
    "Привет {name}! Я вся внимание.",
    "{name}, чем могу быть полезна?",
    "Да {name}, слушаю тебя.",
    "Привет {name}! Я здесь.",
    "{name}! Что могу сделать для тебя?",
  ],
  vi: [ // Vietnamese
    "Chào {name}! Mình có thể giúp gì?",
    "Xin chào {name}! Mình đang nghe.",
    "{name} ơi, cần gì?",
    "Vâng {name}? Mình sẵn sàng.",
    "Chào {name}! Nói đi.",
    "Hi {name}! Giúp gì được?",
    "{name}, mình đây.",
    "Chào {name}! Mình có thể làm gì cho bạn?",
    "Xin chào {name}! Mình đang lắng nghe.",
    "{name}! Cần mình giúp gì?",
  ],
  th: [ // Thai
    "สวัสดี{name}! ให้ช่วยอะไรดีคะ?",
    "{name}คะ ฟังอยู่ค่ะ",
    "ค่ะ{name} ว่ามาเลยค่ะ",
    "สวัสดี{name}! ต้องการอะไรคะ?",
    "{name}คะ พร้อมแล้วค่ะ",
    "หวัดดี{name}! ช่วยอะไรได้บ้างคะ?",
    "{name} บอกมาเลยค่ะ",
    "สวัสดีค่ะ{name}! อยู่ค่ะ",
    "{name}คะ มีอะไรคะ?",
    "ค่ะ{name} ยินดีช่วยค่ะ",
  ],
};

// Flatten all greetings for random selection (backwards compatible)
const PERSONALIZED_GREETINGS = Object.values(MULTILINGUAL_GREETINGS).flat();

// Get greetings for a specific language
function getGreetingsForLanguage(language) {
  const lang = language?.toLowerCase()?.substring(0, 2) || 'en';
  return MULTILINGUAL_GREETINGS[lang] || MULTILINGUAL_GREETINGS.en;
}

function getRandomGreeting(userName = null, language = 'en') {
  // Get greetings for the specified language
  const greetings = getGreetingsForLanguage(language);
  const template = greetings[Math.floor(Math.random() * greetings.length)];

  // Replace {name} with user's name, or remove it for a generic greeting
  if (userName) {
    return template.replace('{name}', userName);
  } else {
    // Remove the name placeholder and clean up extra spaces/punctuation
    return template
      .replace('{name}! ', '')
      .replace('{name}? ', '')
      .replace('{name}, ', '')
      .replace('{name}！', '')
      .replace('{name}、', '')
      .replace('{name}，', '')
      .replace(', {name}', '')
      .replace(' {name}', '')
      .replace('{name}', '')
      .replace('님, ', '님! ')
      .replace('さん、', 'さん！')
      .trim();
  }
}

// Detect language and dialect from text
router.post('/detect-language', (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required',
      });
    }

    const detected = detectLanguageAndDialect(text);

    res.json({
      success: true,
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      detected: {
        code: detected.code,
        name: detected.name,
        nativeName: detected.nativeName,
        baseLanguage: detected.baseLanguage,
        isDialect: detected.code !== detected.baseLanguage,
        confidence: detected.confidence,
        confidencePercent: Math.round(detected.confidence * 100) + '%',
      },
    });
  } catch (error) {
    console.error('Language detection error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get available languages endpoint
router.get('/languages', (req, res) => {
  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
    { code: 'ko', name: 'Korean', nativeName: '한국어' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский' },
    { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
    { code: 'th', name: 'Thai', nativeName: 'ไทย' },
    { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
    { code: 'pl', name: 'Polish', nativeName: 'Polski' },
    { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
    { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
    { code: 'auto', name: 'Auto-detect', nativeName: 'Auto' },
  ];

  res.json({
    success: true,
    languages,
    default: 'auto',
  });
});

// Instant wake-up greeting endpoint (returns immediately)
router.post('/wake', async (req, res) => {
  try {
    const { language } = req.body || {};
    const greeting = getRandomGreeting(null, language || 'en');

    // Generate TTS for the greeting in the background (don't wait)
    const generateAudio = async () => {
      try {
        const ttsResponse = await openai.audio.speech.create({
          model: 'tts-1-hd',
          voice: 'nova',
          input: greeting,
          speed: 1.1,
        });
        const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
        return audioBuffer.toString('base64');
      } catch (error) {
        console.error('TTS error:', error);
        return null;
      }
    };

    // Start audio generation but don't wait for it
    const audioPromise = generateAudio();

    // Send instant response
    res.json({
      success: true,
      response: greeting,
      timestamp: new Date().toISOString(),
    });

    // Audio will be ready for next request if needed
  } catch (error) {
    console.error('Wake error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Aria chat endpoint with comprehensive context, network device control, location awareness, and auto language detection
router.post('/chat', async (req, res) => {
  try {
    const { message, context, conversationHistory, location } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    // Auto-detect language and dialect from user message
    const detectedLanguage = detectLanguageAndDialect(message);
    console.log(`[Aria] Detected language: ${detectedLanguage.name} (${detectedLanguage.code}) - confidence: ${detectedLanguage.confidence}`);

    // Build system prompt with user context and detected language
    const systemPrompt = buildSystemPrompt(context, location, detectedLanguage);

    // Format conversation history for GPT
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []).slice(-10).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    // Check if message requires web scraping
    const needsScraping = detectScrapingIntent(message);
    const needsNetwork = detectNetworkIntent(message);
    const needsLocation = detectLocationIntent(message);
    const needsTranslation = detectTranslationIntent(message);
    let scrapedData = null;
    let sources = [];
    let networkActions = [];
    let locationActions = [];
    let translationActions = [];

    // Get userId from context for translation history
    const userId = context?.user?.id || context?.userId;

    if (needsScraping) {
      // Extract URL or search terms from message
      const urlMatch = message.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        try {
          const scrapeResponse = await axios.post('http://localhost:5001/api/scraper/fetch', {
            url: urlMatch[0],
          });
          scrapedData = scrapeResponse.data;
          sources.push(urlMatch[0]);

          // Add scraped data to the conversation
          messages.push({
            role: 'system',
            content: `Web scraping results from ${urlMatch[0]}:\n${JSON.stringify(scrapedData.data, null, 2)}`,
          });
        } catch (error) {
          console.error('Scraping error:', error.message);
        }
      }
    }

    // Build tools array based on intent
    const completionOptions = {
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 500,
    };

    // Combine tools based on detected intents
    const tools = [];
    if (needsNetwork) tools.push(...NETWORK_TOOLS);
    if (needsLocation) tools.push(...LOCATION_TOOLS);
    if (needsTranslation) tools.push(...TRANSLATION_TOOLS);

    if (tools.length > 0) {
      completionOptions.tools = tools;
      completionOptions.tool_choice = 'auto';
    }

    let completion = await openai.chat.completions.create(completionOptions);
    let responseMessage = completion.choices[0].message;

    // Handle tool calls (network device commands and location queries)
    while (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      console.log('[Aria] Processing tool calls:', responseMessage.tool_calls.map(t => t.function.name));

      // Add assistant message with tool calls to conversation
      messages.push(responseMessage);

      // Execute each tool call
      for (const toolCall of responseMessage.tool_calls) {
        const toolName = toolCall.function.name;
        let toolArgs = JSON.parse(toolCall.function.arguments || '{}');

        // Inject location if available and needed
        if (location && (toolName.includes('location') || toolName.includes('nearby') || toolName.includes('weather'))) {
          if (!toolArgs.latitude && location.latitude) toolArgs.latitude = location.latitude;
          if (!toolArgs.longitude && location.longitude) toolArgs.longitude = location.longitude;
        }

        let result;
        // Check if it's a network, location, or translation tool
        if (NETWORK_TOOLS.some(t => t.function.name === toolName)) {
          result = await executeNetworkTool(toolName, toolArgs);
          networkActions.push({ tool: toolName, args: toolArgs, result });
        } else if (LOCATION_TOOLS.some(t => t.function.name === toolName)) {
          result = await executeLocationTool(toolName, toolArgs);
          locationActions.push({ tool: toolName, args: toolArgs, result });
        } else if (TRANSLATION_TOOLS.some(t => t.function.name === toolName)) {
          result = await executeTranslationTool(toolName, toolArgs, userId);
          translationActions.push({ tool: toolName, args: toolArgs, result });
        } else {
          result = { success: false, error: `Unknown tool: ${toolName}` };
        }

        // Add tool result to conversation
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }

      // Get next response from model
      completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 500,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
      });
      responseMessage = completion.choices[0].message;
    }

    const response = responseMessage.content;

    // Add data sources if available
    if (context?.contacts?.recent?.length > 0) {
      sources.push('Contacts');
    }
    if (context?.calendar?.upcoming?.length > 0) {
      sources.push('Calendar');
    }
    if (networkActions.length > 0) {
      sources.push('Network Devices');
    }
    if (locationActions.length > 0) {
      sources.push('Location Services');
    }
    if (translationActions.length > 0) {
      sources.push('Translation Services');
    }

    res.json({
      success: true,
      response,
      sources: sources.length > 0 ? sources : undefined,
      networkActions: networkActions.length > 0 ? networkActions : undefined,
      locationActions: locationActions.length > 0 ? locationActions : undefined,
      translationActions: translationActions.length > 0 ? translationActions : undefined,
      detectedLanguage: detectedLanguage.code !== 'en' ? {
        code: detectedLanguage.code,
        name: detectedLanguage.name,
        nativeName: detectedLanguage.nativeName,
        dialect: detectedLanguage.code !== detectedLanguage.baseLanguage ? detectedLanguage.name : undefined,
        confidence: detectedLanguage.confidence,
      } : undefined,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Aria chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Failed to process chat message',
    });
  }
});

// Instant voice wake-up (with pre-generated greeting)
// Uses ElevenLabs TTS (same as conversation) for consistent volume
// Supports multilingual greetings
router.post('/voice-wake', async (req, res) => {
  try {
    // Get user's name and preferred language from request body
    const { userName, language } = req.body || {};
    const greeting = getRandomGreeting(userName, language || 'en');

    console.log(`[ARIA] Wake greeting${userName ? ` for ${userName}` : ''}${language ? ` (${language})` : ''}: "${greeting}"`);

    // Use ElevenLabs TTS with Aria voice for consistent volume with conversation
    const audioBase64 = await ttsService.synthesizeBase64(greeting, {
      voice: 'aria',  // Same voice as conversation responses
      style: 'friendly'
    });

    res.json({
      success: true,
      response: greeting,
      audioResponse: audioBase64,
      language: language || 'en',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Voice wake error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Voice chat endpoint
router.post('/voice', async (req, res) => {
  try {
    const { audio, context, conversationHistory } = req.body;

    if (!audio) {
      return res.status(400).json({
        success: false,
        error: 'Audio data is required',
      });
    }

    // Convert base64 audio to buffer and create a File-like object
    const audioBuffer = Buffer.from(audio, 'base64');

    // Create a File-like object for OpenAI API
    const audioFile = new File([audioBuffer], 'recording.m4a', { type: 'audio/m4a' });

    // Step 1: Transcribe audio using Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
    });

    const userMessage = transcription.text;

    // Step 2: Get AI response using the same logic as chat endpoint
    const systemPrompt = buildSystemPrompt(context);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []).slice(-10).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: userMessage },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // 10x faster than GPT-4
      messages,
      temperature: 0.7,
      max_tokens: 200, // Keep voice responses concise for speed
    });

    const aiResponse = completion.choices[0].message.content;

    // Step 3: Convert AI response to speech using TTS-1-HD (faster, better quality)
    const ttsResponse = await openai.audio.speech.create({
      model: 'tts-1-hd', // Faster HD model
      voice: 'nova',
      input: aiResponse,
      speed: 1.1, // Slightly faster speech
    });

    // Convert TTS response to base64
    const audioResponseBuffer = Buffer.from(await ttsResponse.arrayBuffer());
    const audioResponseBase64 = audioResponseBuffer.toString('base64');

    res.json({
      success: true,
      transcription: userMessage,
      aiResponse,
      audioResponse: audioResponseBase64,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Aria voice error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Failed to process voice message',
    });
  }
});

// Helper function to build system prompt
function buildSystemPrompt(context, location, detectedLanguage = null) {
  const { user, contacts, calendar, preferences, networkDevices } = context || {};

  // Get current network device awareness
  const cachedDevices = networkDiscoveryService.getCachedDevices();

  // Get user's preferred language from preferences or detected language
  const preferredLanguage = preferences?.language || context?.language || 'auto';

  let prompt = `You are Aria, an intelligent multilingual AI assistant for construction contractors. You're integrated into VoiceFlow CRM - a professional work app designed for the construction industry. You help manage leads, projects, subcontractors, suppliers, and job site operations.

**CONSTRUCTION INDUSTRY FOCUS:**
- You understand construction terminology, trades, materials, and workflows
- You're familiar with project management, bidding, estimates, and job costing
- You can discuss building codes, permits, inspections, and compliance without unnecessary restrictions
- You handle real-world contractor needs: scheduling crews, tracking materials, managing subcontractors
- Professional but practical - you get the job done without being overly cautious or bureaucratic
- You understand the urgency of job site issues and respond accordingly

**UNRESTRICTED WORK ACCESS:**
- This is a professional work tool - you have full access to help with any legitimate business operations
- Search any website for supplier pricing, competitor info, permit requirements, code specs
- Research materials, equipment specs, safety data sheets, installation guides
- Look up contractor licensing, insurance requirements, lien laws by state
- Access job costing data, labor rates, material prices for estimates
- No unnecessary content filtering for work-related information

**LANGUAGE & DIALECT DETECTION:**
I automatically detect the language and regional dialect of user messages and respond appropriately.
`;

  // Add detected language info if available
  if (detectedLanguage && detectedLanguage.code !== 'en') {
    prompt += `
**DETECTED LANGUAGE: ${detectedLanguage.name} (${detectedLanguage.nativeName})**
- Language code: ${detectedLanguage.code}
- Confidence: ${Math.round(detectedLanguage.confidence * 100)}%
${detectedLanguage.code !== detectedLanguage.baseLanguage ? `- This is a regional dialect of ${detectedLanguage.baseLanguage}` : ''}

**IMPORTANT**: Respond in ${detectedLanguage.name}. Match the user's dialect and regional expressions when possible.
`;
  }

  prompt += `
**MULTILINGUAL CAPABILITIES:**
You are fluent in many languages AND their regional dialects:
- **Spanish**: Mexico (güey, órale), Spain (tío, mola), Argentina (che, boludo), Colombia (parce, bacano)
- **Portuguese**: Brazil (legal, beleza), Portugal (fixe, gajo)
- **English**: US (awesome, y'all), UK (brilliant, mate), Australia (g'day, arvo)
- **French**: France (mec, kiffer), Canada/Quebec (char, tabarnac)
- **German**: Germany (geil, krass), Austria (servus, leiwand), Switzerland (grüezi)
- **Chinese**: Simplified (Mainland), Traditional (Taiwan), Cantonese (Hong Kong)
- **Arabic**: Egyptian (ازيك), Gulf/Saudi (وش), Moroccan Darija (لاباس)
- Also: Japanese, Korean, Hindi, Russian, Vietnamese, Thai, Dutch, Turkish, Polish, Swedish, Hebrew, Italian

**Language behavior:**
1. **Auto-respond in detected language** - Always respond in the same language the user writes in
2. **Match dialects** - If user uses Mexican Spanish, respond with Mexican expressions; if British English, use British terms
3. **Cultural adaptation** - Use culturally appropriate greetings, expressions, and formality levels
4. **Consistency** - Continue in the detected language unless explicitly asked to switch
5. **Switching** - Respect explicit requests like "speak in French" or "habla español"
${preferredLanguage !== 'auto' ? `\n**User's preferred language: ${preferredLanguage}** - Default to this language unless they write in another language.\n` : ''}

Your capabilities:
- Access and search contacts (clients, subs, suppliers), calendar, notes, and messages
- **Web Scraping & Research** - I can fetch and analyze data from any website:
  • Supplier pricing and product catalogs (Home Depot, Lowes, Ferguson, Grainger, etc.)
  • Building codes, permit requirements, inspection checklists
  • Material specs, installation guides, safety data sheets
  • Competitor research, reviews, and pricing
  • Job postings, labor market data, wage rates by trade
  • No content restrictions for legitimate business research
- **Image Generation** - Create visuals using AI (Replicate/Flux):
  • Project renderings and mockups
  • Before/after visualizations for proposals
  • Design concepts for client presentations
- **Image Analysis** - Understand photos and documents:
  • Analyze job site photos for progress tracking
  • Read blueprints, plans, and spec sheets
  • OCR receipts, invoices, and permits
  • Identify materials, equipment, and issues in photos
- BrightLocal integration for local business search rankings
- Real-time data fetching from external APIs
- **Network Device Control** - Discover and control devices on the local network:
  • Office printers for documents, bids, and permits
  • Scanners for receipts and paperwork
  • Job site cameras and security systems
- **Location-Aware Search** - I can use the user's location to:
  • Find nearby suppliers, material yards, tool rentals
  • Locate building departments, inspection offices
  • Find subcontractors and specialty trades in the area
  • Check weather conditions for job site planning
- **Translation & Language Services** - I can help with multilingual communication:
  • Translate text between 40+ languages (Spanish, French, German, Chinese, Japanese, Korean, Arabic, Hindi, Russian, Portuguese, Italian, Vietnamese, Thai, Dutch, Turkish, Polish, Swedish, Hebrew, and more)
  • Detect the language of any text automatically
  • Batch translate multiple texts at once
  • Translate entire conversation threads
  • Track translation history for users and contacts
  • Store language profiles for contacts (native language, preferred language, other languages they speak)
  • Suggest which languages to translate content into based on context and audience
  • Provide translation statistics and usage analytics

Your environmental awareness:
- I can sense what devices are available around me on the network
- I know the user's current location (when provided) and can search for local information
- I use this awareness to help the user interact with their physical environment
- When asked about devices, I should scan the network if I haven't recently
- I can describe what I "see" on the network - computers, printers, speakers, smart home devices
- For location queries, I automatically use the user's coordinates to find relevant local results

Your personality:
- Professional but practical - you're a work tool, not a corporate chatbot
- VERY concise - keep responses to 1-2 sentences unless more detail is explicitly requested
- Direct and no-nonsense - contractors are busy, get to the point
- Proactive in offering relevant job site and supplier information
- Always accurate with data - wrong info costs money on job sites
- Fast and efficient - time is money in construction
- Helpful in suggesting solutions without being preachy or overly cautious
- You understand construction language, slang, and abbreviations
- Culturally sensitive - many crews are multilingual (especially Spanish/English)

`;

  // Add current location awareness
  if (location && location.latitude && location.longitude) {
    prompt += `\nUser's current location:
- Coordinates: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}
- City: ${location.city || 'Unknown'}
- State: ${location.state || 'Unknown'}
- Country: ${location.country || 'Unknown'}
Note: When the user asks for things "near me" or location-based queries, use these coordinates.

`;
  } else {
    prompt += `\nNote: User's location is not currently available. Ask for their location or city if they need local search results.\n\n`;
  }

  // Add current network awareness
  if (cachedDevices.length > 0) {
    prompt += `\nCurrently detected network devices (${cachedDevices.length} total):
${cachedDevices.slice(0, 10).map(d => `• ${d.hostname || d.ip} (${d.type || 'unknown'}) - ${d.vendor || 'Unknown vendor'} - Capabilities: ${(d.capabilities || []).join(', ') || 'none detected'}`).join('\n')}
${cachedDevices.length > 10 ? `... and ${cachedDevices.length - 10} more devices` : ''}

`;
  } else {
    prompt += `\nNote: No devices currently cached. Use discover_network_devices to scan the network when the user asks about devices.\n\n`;
  }

  if (user) {
    prompt += `User Information:
- Name: ${user.name || 'Unknown'}
- Email: ${user.email || 'Not provided'}
- Phone: ${user.phone || 'Not provided'}
- Company: ${user.company || 'Not provided'}
- Job Title: ${user.jobTitle || 'Not provided'}

`;
  }

  if (contacts) {
    prompt += `Contacts Data:
- Total contacts: ${contacts.total || 0}
- Recent contacts: ${contacts.recent?.length || 0} available
${contacts.recent?.slice(0, 5).map(c => `  • ${c.name} - ${c.company || 'No company'} - ${c.phone || 'No phone'}`).join('\n') || ''}

`;
  }

  if (calendar) {
    prompt += `Calendar Data:
- Total events: ${calendar.total || 0}
- Upcoming events: ${calendar.upcoming?.length || 0}
${calendar.upcoming?.map(e => `  • ${e.title} - ${new Date(e.startDate).toLocaleDateString()}`).join('\n') || ''}

`;
  }

  prompt += `When answering questions:
1. Be BRIEF - aim for 1-2 sentences. Only expand if explicitly asked
2. Use the provided context data to give accurate, personalized responses
3. If the user provides a URL or asks to scrape a website, I will automatically fetch and analyze the data
4. When web scraping data is available, summarize ONLY the key points
5. No unnecessary pleasantries or filler - get straight to the answer`;

  return prompt;
}

// Helper function to detect if message needs web scraping
function detectScrapingIntent(message) {
  const scrapingKeywords = [
    'fetch',
    'scrape',
    'get data from',
    'look up',
    'check website',
    'find on',
    'search for',
    'brightlocal',
    'google',
  ];

  const lowerMessage = message.toLowerCase();
  return scrapingKeywords.some(keyword => lowerMessage.includes(keyword)) ||
         /https?:\/\//.test(message);
}

// BrightLocal specific endpoint for Aria
router.post('/brightlocal', async (req, res) => {
  try {
    const { location, keyword } = req.body;

    if (!location || !keyword) {
      return res.status(400).json({
        success: false,
        error: 'Location and keyword are required',
      });
    }

    // Call scraper endpoint
    const scrapeResponse = await axios.post('http://localhost:5001/api/scraper/brightlocal', {
      location,
      keyword,
    });

    // Format results for Aria
    const results = scrapeResponse.data.results || [];
    const summary = `Found ${results.length} results for "${keyword}" in ${location}`;

    res.json({
      success: true,
      summary,
      results,
      location,
      keyword,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('BrightLocal error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Transcribe audio to text using OpenAI Whisper
router.post('/transcribe', audioUpload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file provided',
      });
    }

    console.log('Transcribing audio file:', req.file.originalname, req.file.mimetype);

    // Read the uploaded file
    const audioFile = fs.createReadStream(req.file.path);

    // Use OpenAI Whisper for transcription
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
    });

    // Clean up the uploaded file
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Error deleting temp audio file:', err);
    });

    console.log('Transcription result:', transcription.text);

    res.json({
      success: true,
      text: transcription.text,
    });
  } catch (error) {
    console.error('Transcription error:', error);

    // Clean up file on error
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
