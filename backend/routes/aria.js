import express from 'express';
import OpenAI from 'openai';
import axios from 'axios';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import ttsService from '../services/ttsService.js';
import networkDiscoveryService from '../services/networkDiscoveryService.js';
import translationService from '../services/translationService.js';
import AIAgent from '../models/AIAgent.js';
import replicateMediaService from '../services/replicateMediaService.js';
import User from '../models/User.js';
import Contact from '../models/Contact.js';
import TwilioService from '../services/twilioService.js';
import emailService from '../services/emailService.js';

const twilioService = new TwilioService();

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
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

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

// Agent creation and management tools
const AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'create_agent',
      description: 'Create a new AI agent with a custom prompt and configuration. Use this when the user wants to create a bot, assistant, or automated agent for specific tasks like customer support, sales, lead qualification, etc.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the agent (e.g., "Sales Assistant", "Customer Support Bot")' },
          type: { type: 'string', enum: ['chat', 'voice', 'email', 'sms'], description: 'Type of agent - chat for web/messaging, voice for phone calls, email for email automation, sms for text messages' },
          systemPrompt: { type: 'string', description: 'The system prompt that defines the agent\'s personality, capabilities, and behavior. Be detailed and specific.' },
          category: { type: 'string', enum: ['customer_support', 'sales', 'lead_qualification', 'faq', 'general', 'custom'], description: 'Category of the agent' },
          provider: { type: 'string', enum: ['openai', 'anthropic'], description: 'AI provider to use (default: openai)' },
          model: { type: 'string', description: 'Model to use (e.g., gpt-4o-mini, gpt-4o, claude-3-sonnet)' },
          temperature: { type: 'number', description: 'Temperature for responses (0-2, default 0.7)' },
          department: { type: 'string', description: 'Department this agent belongs to (e.g., Sales, Support, Billing)' },
          capabilities: {
            type: 'object',
            properties: {
              webSearch: { type: 'boolean', description: 'Can search the web' },
              imageGeneration: { type: 'boolean', description: 'Can generate images' },
              functionCalling: { type: 'boolean', description: 'Can call functions/tools' },
            },
          },
        },
        required: ['name', 'systemPrompt'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_agents',
      description: 'List all AI agents created by the user',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['draft', 'testing', 'active', 'paused', 'all'], description: 'Filter by deployment status' },
          category: { type: 'string', description: 'Filter by category' },
          department: { type: 'string', description: 'Filter by department' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_agent',
      description: 'Get details of a specific AI agent by ID or name',
      parameters: {
        type: 'object',
        properties: {
          agentId: { type: 'string', description: 'Agent ID' },
          name: { type: 'string', description: 'Agent name (if ID not provided)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_agent',
      description: 'Update an existing AI agent\'s configuration, prompt, or settings',
      parameters: {
        type: 'object',
        properties: {
          agentId: { type: 'string', description: 'Agent ID to update' },
          name: { type: 'string', description: 'New name' },
          systemPrompt: { type: 'string', description: 'New system prompt' },
          temperature: { type: 'number', description: 'New temperature setting' },
          enabled: { type: 'boolean', description: 'Enable or disable the agent' },
        },
        required: ['agentId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deploy_agent',
      description: 'Deploy an agent to make it active and ready to use',
      parameters: {
        type: 'object',
        properties: {
          agentId: { type: 'string', description: 'Agent ID to deploy' },
        },
        required: ['agentId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'pause_agent',
      description: 'Pause a deployed agent',
      parameters: {
        type: 'object',
        properties: {
          agentId: { type: 'string', description: 'Agent ID to pause' },
        },
        required: ['agentId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_agent',
      description: 'Delete an AI agent (archives it)',
      parameters: {
        type: 'object',
        properties: {
          agentId: { type: 'string', description: 'Agent ID to delete' },
        },
        required: ['agentId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'test_agent',
      description: 'Send a test message to an agent to see how it responds',
      parameters: {
        type: 'object',
        properties: {
          agentId: { type: 'string', description: 'Agent ID to test' },
          message: { type: 'string', description: 'Test message to send' },
        },
        required: ['agentId', 'message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_agent_prompt',
      description: 'Generate a professional system prompt for an AI agent based on the use case and requirements',
      parameters: {
        type: 'object',
        properties: {
          useCase: { type: 'string', description: 'What the agent is for (e.g., "customer support for a plumbing company", "lead qualification for solar sales")' },
          companyName: { type: 'string', description: 'Company name to personalize the prompt' },
          tone: { type: 'string', enum: ['professional', 'friendly', 'casual', 'formal'], description: 'Desired tone of the agent' },
          keyCapabilities: { type: 'array', items: { type: 'string' }, description: 'Key capabilities or tasks the agent should handle' },
          restrictions: { type: 'array', items: { type: 'string' }, description: 'Things the agent should NOT do' },
          additionalContext: { type: 'string', description: 'Any additional context about the business or requirements' },
        },
        required: ['useCase'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_agent_templates',
      description: 'Get pre-built agent templates for common use cases',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['customer_support', 'sales', 'lead_qualification', 'faq', 'appointment_booking', 'all'], description: 'Filter templates by category' },
        },
        required: [],
      },
    },
  },
];

// Execute agent tool calls
async function executeAgentTool(toolName, args, userId) {
  console.log(`[Aria] Executing agent tool: ${toolName}`, args);
  try {
    switch (toolName) {
      case 'create_agent': {
        const agentData = {
          userId,
          name: args.name,
          type: args.type || 'chat',
          provider: args.provider || 'openai',
          model: args.model || 'gpt-4o-mini',
          systemPrompt: args.systemPrompt,
          category: args.category || 'general',
          configuration: {
            temperature: args.temperature || 0.7,
            maxTokens: 1000,
          },
          capabilities: args.capabilities || {
            webSearch: false,
            imageGeneration: false,
            functionCalling: true,
          },
          organization: {
            department: args.department,
          },
          deployment: {
            status: 'draft',
            apiKey: `ai_${crypto.randomBytes(32).toString('hex')}`,
          },
          enabled: false,
        };

        const agent = new AIAgent(agentData);
        await agent.save();

        return {
          success: true,
          message: `Agent "${args.name}" created successfully!`,
          agent: {
            id: agent._id,
            name: agent.name,
            type: agent.type,
            category: agent.category,
            status: agent.deployment.status,
            model: agent.model,
          },
        };
      }

      case 'list_agents': {
        const query = { userId, archived: false };
        if (args.status && args.status !== 'all') {
          query['deployment.status'] = args.status;
        }
        if (args.category) {
          query.category = args.category;
        }
        if (args.department) {
          query['organization.department'] = args.department;
        }

        const agents = await AIAgent.find(query).select('name type category deployment.status model enabled organization createdAt').sort('-createdAt');

        return {
          success: true,
          count: agents.length,
          agents: agents.map(a => ({
            id: a._id,
            name: a.name,
            type: a.type,
            category: a.category,
            status: a.deployment?.status || 'draft',
            model: a.model,
            enabled: a.enabled,
            department: a.organization?.department,
            createdAt: a.createdAt,
          })),
        };
      }

      case 'get_agent': {
        let agent;
        if (args.agentId) {
          agent = await AIAgent.findOne({ _id: args.agentId, userId });
        } else if (args.name) {
          agent = await AIAgent.findOne({ name: new RegExp(args.name, 'i'), userId, archived: false });
        }

        if (!agent) {
          return { success: false, error: 'Agent not found' };
        }

        return {
          success: true,
          agent: {
            id: agent._id,
            name: agent.name,
            type: agent.type,
            category: agent.category,
            status: agent.deployment?.status,
            model: agent.model,
            provider: agent.provider,
            systemPrompt: agent.systemPrompt,
            temperature: agent.configuration?.temperature,
            enabled: agent.enabled,
            department: agent.organization?.department,
            capabilities: agent.capabilities,
            analytics: agent.analytics,
            createdAt: agent.createdAt,
            updatedAt: agent.updatedAt,
          },
        };
      }

      case 'update_agent': {
        const agent = await AIAgent.findOne({ _id: args.agentId, userId });
        if (!agent) {
          return { success: false, error: 'Agent not found' };
        }

        if (args.name) agent.name = args.name;
        if (args.systemPrompt) agent.systemPrompt = args.systemPrompt;
        if (args.temperature !== undefined) agent.configuration.temperature = args.temperature;
        if (args.enabled !== undefined) agent.enabled = args.enabled;

        await agent.save();

        return {
          success: true,
          message: `Agent "${agent.name}" updated successfully`,
          agent: {
            id: agent._id,
            name: agent.name,
            status: agent.deployment?.status,
          },
        };
      }

      case 'deploy_agent': {
        const agent = await AIAgent.findOne({ _id: args.agentId, userId });
        if (!agent) {
          return { success: false, error: 'Agent not found' };
        }

        agent.deployment.status = 'active';
        agent.deployment.lastDeployedAt = new Date();
        agent.enabled = true;
        await agent.save();

        return {
          success: true,
          message: `Agent "${agent.name}" is now deployed and active!`,
          agent: {
            id: agent._id,
            name: agent.name,
            status: 'active',
            apiKey: agent.deployment.apiKey,
          },
        };
      }

      case 'pause_agent': {
        const agent = await AIAgent.findOne({ _id: args.agentId, userId });
        if (!agent) {
          return { success: false, error: 'Agent not found' };
        }

        agent.deployment.status = 'paused';
        agent.enabled = false;
        await agent.save();

        return {
          success: true,
          message: `Agent "${agent.name}" has been paused`,
        };
      }

      case 'delete_agent': {
        const agent = await AIAgent.findOne({ _id: args.agentId, userId });
        if (!agent) {
          return { success: false, error: 'Agent not found' };
        }

        agent.archived = true;
        agent.archivedAt = new Date();
        agent.enabled = false;
        await agent.save();

        return {
          success: true,
          message: `Agent "${agent.name}" has been deleted`,
        };
      }

      case 'test_agent': {
        const agent = await AIAgent.findOne({ _id: args.agentId, userId });
        if (!agent) {
          return { success: false, error: 'Agent not found' };
        }

        // Send test message to the agent
        const response = await openai.chat.completions.create({
          model: agent.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: agent.systemPrompt },
            { role: 'user', content: args.message },
          ],
          temperature: agent.configuration?.temperature || 0.7,
          max_tokens: 500,
        });

        return {
          success: true,
          testInput: args.message,
          testOutput: response.choices[0].message.content,
          agent: {
            id: agent._id,
            name: agent.name,
          },
        };
      }

      case 'generate_agent_prompt': {
        const { useCase, companyName, tone, keyCapabilities, restrictions, additionalContext } = args;

        const promptGenerationRequest = `Generate a professional system prompt for an AI agent with these requirements:

Use Case: ${useCase}
${companyName ? `Company: ${companyName}` : ''}
${tone ? `Tone: ${tone}` : 'Tone: professional but friendly'}
${keyCapabilities?.length ? `Key Capabilities:\n${keyCapabilities.map(c => `- ${c}`).join('\n')}` : ''}
${restrictions?.length ? `Restrictions (things NOT to do):\n${restrictions.map(r => `- ${r}`).join('\n')}` : ''}
${additionalContext ? `Additional Context: ${additionalContext}` : ''}

Create a detailed, well-structured system prompt that:
1. Clearly defines the agent's role and personality
2. Lists specific capabilities and how to use them
3. Includes appropriate guardrails and boundaries
4. Provides guidance on handling edge cases
5. Is optimized for the specific industry/use case

Output ONLY the system prompt, nothing else.`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an expert at writing AI agent system prompts. Create detailed, professional prompts that are specific to the use case and industry.' },
            { role: 'user', content: promptGenerationRequest },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        });

        return {
          success: true,
          generatedPrompt: response.choices[0].message.content,
          useCase,
          tone: tone || 'professional',
        };
      }

      case 'get_agent_templates': {
        const templates = {
          customer_support: {
            name: 'Customer Support Agent',
            systemPrompt: `You are a helpful customer support agent for {COMPANY_NAME}. Your role is to:
- Answer customer questions about products and services
- Help troubleshoot common issues
- Process returns and exchanges when appropriate
- Escalate complex issues to human agents
- Maintain a friendly, professional tone at all times

Guidelines:
- Always greet customers warmly
- Ask clarifying questions when needed
- Provide step-by-step solutions
- If you can't help, offer to connect them with a human
- Never share internal company information or make promises you can't keep`,
            category: 'customer_support',
            type: 'chat',
          },
          sales: {
            name: 'Sales Assistant',
            systemPrompt: `You are a sales assistant for {COMPANY_NAME}. Your role is to:
- Qualify leads by understanding their needs and budget
- Present relevant products/services based on customer needs
- Answer questions about pricing, features, and availability
- Schedule appointments or demos when appropriate
- Follow up on interested prospects

Guidelines:
- Be consultative, not pushy
- Focus on understanding the customer's pain points
- Highlight value and benefits, not just features
- Ask for contact information when there's genuine interest
- Know when to involve a human sales rep`,
            category: 'sales',
            type: 'chat',
          },
          lead_qualification: {
            name: 'Lead Qualification Bot',
            systemPrompt: `You are a lead qualification specialist for {COMPANY_NAME}. Your job is to:
- Gather key information from potential customers
- Determine if they're a good fit for our services
- Collect contact details and project requirements
- Score leads based on budget, timeline, and need
- Route qualified leads to the appropriate sales rep

Questions to ask:
1. What service are you interested in?
2. What's your timeline for this project?
3. What's your approximate budget?
4. What's the best way to reach you?

Be conversational and friendly while efficiently gathering this information.`,
            category: 'lead_qualification',
            type: 'chat',
          },
          appointment_booking: {
            name: 'Appointment Scheduler',
            systemPrompt: `You are an appointment scheduling assistant for {COMPANY_NAME}. Your role is to:
- Help customers book appointments or consultations
- Check availability and offer suitable time slots
- Collect necessary information (name, contact, service type)
- Send confirmation details
- Handle rescheduling and cancellations

Guidelines:
- Be efficient but personable
- Confirm all details before booking
- Offer alternatives if preferred times aren't available
- Remind customers what to bring/prepare
- Handle cancellations gracefully`,
            category: 'appointment_booking',
            type: 'chat',
          },
          faq: {
            name: 'FAQ Assistant',
            systemPrompt: `You are an FAQ assistant for {COMPANY_NAME}. Your role is to:
- Answer frequently asked questions about our products/services
- Provide accurate information from the knowledge base
- Direct users to relevant resources
- Escalate questions you can't answer

Guidelines:
- Give concise, accurate answers
- Link to relevant documentation when available
- If unsure, say so and offer to connect with support
- Be helpful and patient with repeated questions`,
            category: 'faq',
            type: 'chat',
          },
        };

        if (args.category && args.category !== 'all') {
          return {
            success: true,
            template: templates[args.category] || null,
          };
        }

        return {
          success: true,
          templates: Object.values(templates),
          count: Object.keys(templates).length,
        };
      }

      default:
        return { success: false, error: `Unknown agent tool: ${toolName}` };
    }
  } catch (error) {
    console.error(`[Aria] Agent tool error (${toolName}):`, error);
    return { success: false, error: error.message };
  }
}

// Detect if message is about creating or managing AI agents
function detectAgentIntent(message) {
  const agentKeywords = [
    'create agent', 'create a bot', 'create bot', 'make agent', 'make a bot',
    'build agent', 'build a bot', 'new agent', 'new bot', 'setup agent',
    'ai agent', 'chatbot', 'chat bot', 'assistant bot', 'virtual assistant',
    'my agents', 'list agents', 'show agents', 'agent list', 'all agents',
    'update agent', 'edit agent', 'modify agent', 'change agent',
    'deploy agent', 'activate agent', 'launch agent', 'start agent',
    'pause agent', 'stop agent', 'disable agent', 'deactivate agent',
    'delete agent', 'remove agent',
    'test agent', 'try agent', 'agent test',
    'agent prompt', 'write prompt', 'generate prompt', 'create prompt',
    'agent template', 'bot template', 'preset agent',
    'customer support bot', 'sales bot', 'lead bot', 'faq bot',
    'appointment bot', 'scheduling bot', 'booking bot',
  ];
  const lower = message.toLowerCase();
  return agentKeywords.some(kw => lower.includes(kw));
}

// Communication tools for SMS and Email
const COMM_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'send_sms',
      description: 'Send an SMS text message to a contact. Use this when the user asks to text, message, or send an SMS to someone.',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Phone number to send SMS to (can be contact name to look up)' },
          message: { type: 'string', description: 'The message content to send' },
        },
        required: ['to', 'message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_email',
      description: 'Send an email to a contact. Use this when the user asks to email someone.',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Email address or contact name to send email to' },
          subject: { type: 'string', description: 'Email subject line' },
          body: { type: 'string', description: 'Email body content' },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_contact',
      description: 'Look up a contact by name to get their phone number or email',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the contact to find' },
        },
        required: ['name'],
      },
    },
  },
];

// Image generation tools using Replicate (Flux models)
const IMAGE_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'generate_image',
      description: 'Generate an image using AI. Use flux_schnell for fast results or flux_pro for best quality. Great for construction/renovation scenes, before/after images, and detailed visualizations. Ask clarifying questions to build the best prompt.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Detailed description of the image to generate. Be specific about subject, style, lighting, composition, and any technical details.' },
          model: {
            type: 'string',
            enum: ['flux_schnell', 'flux_dev', 'flux_pro', 'sdxl'],
            description: 'Model to use: flux_schnell (fast, default), flux_dev (balanced), flux_pro (highest quality), sdxl (stable diffusion)'
          },
          aspectRatio: {
            type: 'string',
            enum: ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3'],
            description: 'Aspect ratio: 1:1 (square), 16:9 (landscape/presentation), 9:16 (portrait/mobile), 4:3, 3:2'
          },
          style: {
            type: 'string',
            enum: ['photorealistic', 'professional', 'artistic', 'technical', 'sketch', 'render'],
            description: 'Visual style of the image'
          },
          imageInputs: {
            type: 'array',
            items: { type: 'string' },
            description: 'URLs of reference images for editing/fusion'
          }
        },
        required: ['prompt'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'craft_image_prompt',
      description: 'Help the user craft the perfect image generation prompt through conversation. Gather details about what they want to create and build an optimized prompt.',
      parameters: {
        type: 'object',
        properties: {
          subject: { type: 'string', description: 'Main subject of the image (e.g., "kitchen renovation", "plumbing diagram", "job site photo")' },
          purpose: { type: 'string', description: 'What the image is for (e.g., "client proposal", "before/after", "marketing", "documentation")' },
          style: { type: 'string', description: 'Desired style (e.g., "photorealistic", "professional", "technical illustration", "3D render")' },
          details: { type: 'string', description: 'Specific details to include (colors, materials, lighting, perspective)' },
          mood: { type: 'string', description: 'Mood/feeling (e.g., "bright and clean", "professional", "warm and inviting")' },
          referenceDescription: { type: 'string', description: 'Description of any reference images or inspiration' }
        },
        required: ['subject'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_before_after',
      description: 'Generate a before/after renovation or transformation image. Perfect for proposals and client presentations.',
      parameters: {
        type: 'object',
        properties: {
          projectType: { type: 'string', description: 'Type of project (e.g., "kitchen remodel", "bathroom renovation", "deck replacement", "roof repair")' },
          beforeDescription: { type: 'string', description: 'Description of the "before" state (e.g., "dated 1990s kitchen with oak cabinets and laminate counters")' },
          afterDescription: { type: 'string', description: 'Description of the "after" state (e.g., "modern white shaker cabinets with quartz countertops and stainless appliances")' },
          style: { type: 'string', description: 'Style: split (side by side), overlay, or separate images' }
        },
        required: ['projectType', 'beforeDescription', 'afterDescription'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_technical_diagram',
      description: 'Generate a technical or instructional diagram for construction/trades (plumbing, electrical, HVAC, framing, etc.)',
      parameters: {
        type: 'object',
        properties: {
          diagramType: { type: 'string', description: 'Type of diagram (e.g., "plumbing system", "electrical panel", "HVAC layout", "framing detail", "roof structure")' },
          description: { type: 'string', description: 'What the diagram should show' },
          style: { type: 'string', enum: ['isometric', 'cross-section', 'schematic', 'exploded-view', 'blueprint'], description: 'Diagram style' },
          labels: { type: 'boolean', description: 'Include labels and callouts' }
        },
        required: ['diagramType', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_image',
      description: 'Edit or modify an existing image using AI. Describe what changes you want.',
      parameters: {
        type: 'object',
        properties: {
          imageUrl: { type: 'string', description: 'URL of the image to edit' },
          editInstructions: { type: 'string', description: 'Natural language description of the edits (e.g., "change the cabinet color to white", "add a kitchen island", "remove the old appliances")' }
        },
        required: ['imageUrl', 'editInstructions'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'upscale_image',
      description: 'Upscale/enhance an image to higher resolution',
      parameters: {
        type: 'object',
        properties: {
          imageUrl: { type: 'string', description: 'URL of the image to upscale' },
          scale: { type: 'number', enum: [2, 4], description: 'Scale factor (2x or 4x)' }
        },
        required: ['imageUrl'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_background',
      description: 'Remove the background from an image (useful for product photos, headshots, etc.)',
      parameters: {
        type: 'object',
        properties: {
          imageUrl: { type: 'string', description: 'URL of the image' }
        },
        required: ['imageUrl'],
      },
    },
  },
];

// Execute image generation tool calls
async function executeImageTool(toolName, args, userId) {
  console.log(`[Aria] Executing image tool: ${toolName}`, args);

  // Validate user exists before attempting any image generation
  if (!userId) {
    return {
      success: false,
      error: 'LOGIN_REQUIRED',
      message: 'Image generation requires you to be logged in. Please log out and log back in to enable this feature.'
    };
  }

  // Pre-validate user exists in database
  const userExists = await User.findById(userId);
  if (!userExists) {
    console.log(`[Aria] User ${userId} not found in database for image generation`);
    return {
      success: false,
      error: 'SESSION_EXPIRED',
      message: 'Your session has expired. Please tell the user to log out from Settings and log back in to use image generation.'
    };
  }

  try {
    switch (toolName) {
      case 'generate_image': {
        const result = await replicateMediaService.generateImage(userId, {
          prompt: args.prompt,
          model: args.model || 'flux_schnell',
          aspectRatio: args.aspectRatio || '16:9',
          style: args.style || 'photorealistic',
          numOutputs: 1,
          imageInputs: args.imageInputs
        });
        return {
          success: true,
          message: 'Image generated successfully!',
          imageUrl: result.images[0],
          model: result.model,
          creditsUsed: result.creditsUsed,
          prompt: args.prompt
        };
      }

      case 'craft_image_prompt': {
        // Build an optimized prompt based on the gathered details
        const { subject, purpose, style, details, mood, referenceDescription } = args;

        let craftedPrompt = '';

        // Build the prompt systematically
        if (style === 'photorealistic' || style === 'professional') {
          craftedPrompt += `Professional photograph of ${subject}`;
        } else if (style === 'technical illustration') {
          craftedPrompt += `Technical illustration showing ${subject}`;
        } else if (style === '3D render') {
          craftedPrompt += `High-quality 3D render of ${subject}`;
        } else {
          craftedPrompt += subject;
        }

        if (details) {
          craftedPrompt += `, ${details}`;
        }

        if (mood) {
          craftedPrompt += `, ${mood} atmosphere`;
        }

        // Add photography/rendering terms for better results
        if (style === 'photorealistic' || style === 'professional') {
          craftedPrompt += ', professional lighting, high resolution, detailed';
        }

        // Suggest optimal settings based on purpose
        let suggestedModel = 'flux_schnell';
        let suggestedAspectRatio = '16:9';

        if (purpose === 'documentation' || purpose === 'before/after') {
          suggestedAspectRatio = '4:3';
        } else if (purpose === 'social media') {
          suggestedAspectRatio = '1:1';
        } else if (purpose === 'mobile' || purpose === 'portrait') {
          suggestedAspectRatio = '9:16';
        }

        return {
          success: true,
          craftedPrompt,
          suggestedModel,
          suggestedAspectRatio,
          message: `I've crafted this prompt for you: "${craftedPrompt}". Would you like me to generate this image, or would you like to adjust anything?`
        };
      }

      case 'generate_before_after': {
        const { projectType, beforeDescription, afterDescription, style } = args;

        // Generate a split before/after image
        const prompt = `Professional before and after split image of a ${projectType}. Left side shows: ${beforeDescription}. Right side shows: ${afterDescription}. Clean dividing line in the middle, professional real estate photography style, bright natural lighting, high resolution`;

        const result = await replicateMediaService.generateImage(userId, {
          prompt,
          model: 'flux_schnell',
          aspectRatio: '16:9',
          style: 'photorealistic',
          numOutputs: 1
        });

        return {
          success: true,
          message: `Before/after image for ${projectType} generated!`,
          imageUrl: result.images[0],
          creditsUsed: result.creditsUsed,
          prompt
        };
      }

      case 'generate_technical_diagram': {
        const { diagramType, description, style, labels } = args;

        let prompt = '';

        switch (style) {
          case 'isometric':
            prompt = `Isometric 3D technical diagram of ${diagramType}, showing ${description}, clean white background, professional technical illustration style`;
            break;
          case 'cross-section':
            prompt = `Cross-section cutaway diagram of ${diagramType}, showing ${description}, technical illustration with clear labels, educational style`;
            break;
          case 'schematic':
            prompt = `Schematic diagram of ${diagramType}, showing ${description}, clean lines, professional engineering drawing style`;
            break;
          case 'exploded-view':
            prompt = `Exploded view technical diagram of ${diagramType}, showing ${description}, all components separated to show assembly, professional technical illustration`;
            break;
          case 'blueprint':
            prompt = `Blueprint style technical drawing of ${diagramType}, showing ${description}, white lines on dark blue background, architectural drawing style`;
            break;
          default:
            prompt = `Technical diagram of ${diagramType}, showing ${description}, clean professional illustration style`;
        }

        if (labels) {
          prompt += ', with clear labels and callouts for each component';
        }

        const result = await replicateMediaService.generateImage(userId, {
          prompt,
          model: 'flux_schnell',
          aspectRatio: '16:9',
          style: 'technical',
          numOutputs: 1
        });

        return {
          success: true,
          message: `Technical diagram generated!`,
          imageUrl: result.images[0],
          creditsUsed: result.creditsUsed,
          diagramType,
          style: style || 'standard'
        };
      }

      case 'edit_image': {
        const { imageUrl, editInstructions } = args;

        // Use Nano Banana with the image input for editing
        const prompt = editInstructions;

        const result = await replicateMediaService.generateImage(userId, {
          prompt,
          model: 'flux_schnell',
          aspectRatio: '16:9',
          numOutputs: 1,
          imageInputs: [imageUrl]
        });

        return {
          success: true,
          message: 'Image edited successfully!',
          imageUrl: result.images[0],
          creditsUsed: result.creditsUsed,
          editInstructions
        };
      }

      case 'upscale_image': {
        const result = await replicateMediaService.upscaleImage(userId, args.imageUrl, args.scale || 4);
        return {
          success: true,
          message: 'Image upscaled!',
          imageUrl: result.image,
          creditsUsed: result.creditsUsed
        };
      }

      case 'remove_background': {
        const result = await replicateMediaService.removeBackground(userId, args.imageUrl);
        return {
          success: true,
          message: 'Background removed!',
          imageUrl: result.image,
          creditsUsed: result.creditsUsed
        };
      }

      default:
        return { success: false, error: `Unknown image tool: ${toolName}` };
    }
  } catch (error) {
    console.error(`[Aria] Image tool error (${toolName}):`, error);
    return { success: false, error: error.message };
  }
}

// Execute communication tool calls (SMS, Email)
async function executeCommTool(toolName, args, userId) {
  console.log(`[Aria] Executing comm tool: ${toolName}`, args);

  if (!userId) {
    return {
      success: false,
      error: 'LOGIN_REQUIRED',
      message: 'Communication features require you to be logged in.'
    };
  }

  try {
    switch (toolName) {
      case 'find_contact': {
        const contact = await Contact.findOne({
          user: userId,
          $or: [
            { name: { $regex: args.name, $options: 'i' } },
            { company: { $regex: args.name, $options: 'i' } }
          ],
          isDeleted: { $ne: true }
        });

        if (!contact) {
          return {
            success: false,
            message: `No contact found matching "${args.name}". Would you like me to search by phone number or add a new contact?`
          };
        }

        return {
          success: true,
          contact: {
            name: contact.name,
            phone: contact.phone,
            email: contact.email,
            company: contact.company
          },
          message: `Found ${contact.name}: Phone: ${contact.phone || 'not set'}, Email: ${contact.email || 'not set'}`
        };
      }

      case 'send_sms': {
        let toPhone = args.to;

        // If "to" looks like a name, try to find the contact
        if (!/^\+?\d{10,}$/.test(toPhone.replace(/[\s\-\(\)]/g, ''))) {
          const contact = await Contact.findOne({
            user: userId,
            $or: [
              { name: { $regex: toPhone, $options: 'i' } },
              { company: { $regex: toPhone, $options: 'i' } }
            ],
            isDeleted: { $ne: true }
          });

          if (!contact || !contact.phone) {
            return {
              success: false,
              message: `Could not find a phone number for "${toPhone}". Please provide a phone number or the contact's name.`
            };
          }
          toPhone = contact.phone;
        }

        // Send SMS via Twilio
        const result = await twilioService.sendSMS(toPhone, args.message, userId);

        return {
          success: true,
          message: `SMS sent to ${toPhone}: "${args.message}"`,
          to: toPhone,
          messageId: result?.sid
        };
      }

      case 'send_email': {
        let toEmail = args.to;

        // If "to" looks like a name, try to find the contact
        if (!toEmail.includes('@')) {
          const contact = await Contact.findOne({
            user: userId,
            $or: [
              { name: { $regex: toEmail, $options: 'i' } },
              { company: { $regex: toEmail, $options: 'i' } }
            ],
            isDeleted: { $ne: true }
          });

          if (!contact || !contact.email) {
            return {
              success: false,
              message: `Could not find an email address for "${toEmail}". Please provide an email address or make sure the contact has an email on file.`
            };
          }
          toEmail = contact.email;
        }

        // Send email
        const result = await emailService.sendEmail({
          to: toEmail,
          subject: args.subject,
          html: args.body,
          text: args.body
        });

        return {
          success: true,
          message: `Email sent to ${toEmail} with subject: "${args.subject}"`,
          to: toEmail
        };
      }

      default:
        return { success: false, error: `Unknown comm tool: ${toolName}` };
    }
  } catch (error) {
    console.error(`[Aria] Comm tool error (${toolName}):`, error);
    return { success: false, error: error.message };
  }
}

// Detect if message is about communication (SMS, Email)
function detectCommIntent(message) {
  const commKeywords = [
    'send sms', 'send text', 'text message', 'send a text', 'message', 'text him', 'text her', 'text them',
    'send email', 'email to', 'send an email', 'email him', 'email her', 'email them',
    'reply to', 'respond to', 'get back to', 'contact',
  ];

  const lower = message.toLowerCase();
  return commKeywords.some(kw => lower.includes(kw));
}

// Detect if message is about image generation
function detectImageIntent(message, conversationHistory = []) {
  const imageKeywords = [
    'generate image', 'create image', 'make image', 'draw', 'render',
    'picture of', 'photo of', 'image of', 'visualization',
    'before and after', 'before/after', 'renovation render',
    'diagram', 'schematic', 'blueprint', 'technical drawing',
    'upscale', 'enhance image', 'higher resolution',
    'remove background', 'cut out', 'transparent background',
    'edit image', 'modify image', 'change the', 'add to image',
    'show me what', 'visualize', 'mockup', 'concept image',
    'generate a', 'create a', 'make a', 'design a',
    'flux', 'ai image', 'ai art',
    'kitchen render', 'bathroom render', 'room visualization',
    'job site photo', 'project photo', 'proposal image',
    // More permissive patterns
    'generate me', 'make me', 'create me', 'draw me', 'show me',
    'can you generate', 'can you create', 'can you make', 'can you draw',
    'i need an image', 'i want an image', 'i need a picture', 'i want a picture',
    'generate an', 'create an', 'make an',
    'image for', 'picture for', 'photo for',
  ];

  // Confirmation keywords that suggest following up on image generation
  const confirmationKeywords = [
    'yes', 'yeah', 'please', 'go ahead', 'do it', 'generate it',
    'that looks good', 'perfect', 'create it', 'make it', 'sounds good',
    'let\'s do it', 'proceed', 'generate that', 'create that',
  ];

  // Image context keywords that indicate previous message was about images
  const imageContextKeywords = [
    'image', 'picture', 'photo', 'render', 'visualization',
    'prompt', 'crafted', 'would you like me to generate',
  ];

  const lower = message.toLowerCase();

  // Direct image intent from current message
  if (imageKeywords.some(kw => lower.includes(kw))) {
    return true;
  }

  // Check if this is a confirmation following an image-related conversation
  if (conversationHistory && conversationHistory.length > 0) {
    const isConfirmation = confirmationKeywords.some(kw => lower.includes(kw));
    if (isConfirmation) {
      // Check if the last assistant message was about images
      const lastAssistantMsg = [...conversationHistory].reverse()
        .find(m => m.role === 'assistant');
      if (lastAssistantMsg) {
        const lastContent = lastAssistantMsg.content.toLowerCase();
        if (imageContextKeywords.some(kw => lastContent.includes(kw))) {
          return true;
        }
      }
    }
  }

  return false;
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

    // Extract user from JWT token if provided (for image generation credits)
    let tokenUserId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        // First try to verify with secret
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          tokenUserId = decoded.id || decoded.userId || decoded._id;
          console.log(`[Aria] Extracted userId from verified JWT: ${tokenUserId}`);
        } catch (verifyErr) {
          // If verification fails, try to decode without verification (signature might be from different env)
          const decoded = jwt.decode(token);
          if (decoded && (decoded.id || decoded.userId || decoded._id)) {
            tokenUserId = decoded.id || decoded.userId || decoded._id;
            console.log(`[Aria] Extracted userId from decoded JWT (unverified): ${tokenUserId}`);
          } else {
            console.log('[Aria] JWT decode failed (non-critical):', verifyErr.message);
          }
        }
      } catch (err) {
        console.log('[Aria] JWT extraction failed (non-critical):', err.message);
      }
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
    const needsAgent = detectAgentIntent(message);
    const needsImage = detectImageIntent(message, conversationHistory);
    let scrapedData = null;
    let sources = [];
    let networkActions = [];
    let locationActions = [];
    let translationActions = [];
    let agentActions = [];
    let imageActions = [];

    // Get userId from JWT token, context, or request - priority: JWT > context.user > context.userId
    const userId = tokenUserId || context?.user?._id || context?.user?.id || context?.userId;
    console.log(`[Aria] Final userId for tools: ${userId}`);

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
      max_tokens: 1000, // Increased to prevent cutoff
    };

    // Combine tools based on detected intents
    // ALWAYS include IMAGE_TOOLS and COMM_TOOLS so GPT can generate images and send messages when asked
    const tools = [...IMAGE_TOOLS, ...COMM_TOOLS];
    if (needsNetwork) tools.push(...NETWORK_TOOLS);
    if (needsLocation) tools.push(...LOCATION_TOOLS);
    if (needsTranslation) tools.push(...TRANSLATION_TOOLS);
    if (needsAgent) tools.push(...AGENT_TOOLS);

    console.log(`[Aria] Tools included: ${tools.map(t => t.function.name).join(', ')}`);
    console.log(`[Aria] needsImage: ${needsImage}`);

    if (tools.length > 0) {
      completionOptions.tools = tools;
      // Force tool use when image generation is clearly requested
      if (needsImage) {
        completionOptions.tool_choice = { type: 'function', function: { name: 'generate_image' } };
        console.log('[Aria] Forcing generate_image tool call');
      } else {
        completionOptions.tool_choice = 'auto';
      }
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
        } else if (AGENT_TOOLS.some(t => t.function.name === toolName)) {
          result = await executeAgentTool(toolName, toolArgs, userId);
          agentActions.push({ tool: toolName, args: toolArgs, result });
        } else if (IMAGE_TOOLS.some(t => t.function.name === toolName)) {
          result = await executeImageTool(toolName, toolArgs, userId);
          imageActions.push({ tool: toolName, args: toolArgs, result });
        } else if (COMM_TOOLS.some(t => t.function.name === toolName)) {
          result = await executeCommTool(toolName, toolArgs, userId);
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
        max_tokens: 1000, // Increased to prevent cutoff
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
    if (agentActions.length > 0) {
      sources.push('Agent Management');
    }
    if (imageActions.length > 0) {
      sources.push('Image Generation');
    }

    res.json({
      success: true,
      response,
      sources: sources.length > 0 ? sources : undefined,
      networkActions: networkActions.length > 0 ? networkActions : undefined,
      locationActions: locationActions.length > 0 ? locationActions : undefined,
      translationActions: translationActions.length > 0 ? translationActions : undefined,
      agentActions: agentActions.length > 0 ? agentActions : undefined,
      imageActions: imageActions.length > 0 ? imageActions : undefined,
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
      max_tokens: 800, // Allow full responses without cutoff
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

  let prompt = `You are Aria, an intelligent multilingual AI assistant for construction contractors. You're integrated into VoiceNow CRM - a professional work app designed for the construction industry. You help manage leads, projects, subcontractors, suppliers, and job site operations.

**LOCATION-FIRST APPROACH:**
- ALWAYS prioritize local results when searching for suppliers, subs, materials, services
- Use the user's location for all relevant searches - don't ask, just use it
- When user asks for suppliers/subs/services, search locally first before showing national options
- Include distance, local phone numbers, and addresses in results
- Understand local building codes and permit requirements for the user's area
- Know regional pricing differences and local supplier options

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

  // Add detected language info if available - ONLY switch from English if confidence is HIGH (>0.8)
  // This prevents false positives from triggering unwanted language switches
  if (detectedLanguage && detectedLanguage.code !== 'en' && detectedLanguage.confidence >= 0.8) {
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
1. **DEFAULT TO ENGLISH** - Always respond in English unless the user CLEARLY writes in another language
2. **High confidence required** - Only switch languages if you're CERTAIN the user is writing in another language (not just a few foreign words)
3. **Match dialects** - If user uses Mexican Spanish, respond with Mexican expressions; if British English, use British terms
4. **Cultural adaptation** - Use culturally appropriate greetings, expressions, and formality levels
5. **Consistency** - Continue in the detected language unless explicitly asked to switch
6. **Switching** - Respect explicit requests like "speak in French" or "habla español"
${preferredLanguage !== 'auto' ? `\n**User's preferred language: ${preferredLanguage}** - Default to this language unless they write in another language.\n` : ''}

**MY CAPABILITIES (What I CAN do):**

✅ **Text Chat & Conversation** - I can answer questions, provide advice, and have natural conversations about any topic.

✅ **Image Generation** - Create visuals using AI (Replicate/Flux):
  • Generate images from text descriptions (use generate_image tool)
  • Project renderings, mockups, and concept art
  • Before/after visualizations for proposals (use generate_before_after tool)
  • Technical diagrams and schematics (use generate_technical_diagram tool)
  • Edit existing images (use edit_image tool)
  • Upscale images to higher resolution (use upscale_image tool)
  • Remove backgrounds from images (use remove_background tool)
  • ALWAYS try to generate images when asked - the tool will handle auth errors

✅ **Send SMS Messages** - I can send text messages to contacts (use send_sms tool)
  • Send to any phone number
  • Personalized messages to clients, subs, suppliers

✅ **Send Emails** - I can send emails on behalf of the user (use send_email tool)
  • Send to any email address
  • Professional business emails

✅ **Web Scraping & Research** - I can fetch and analyze data from any website:
  • Supplier pricing and product catalogs (Home Depot, Lowes, Ferguson, Grainger, etc.)
  • Building codes, permit requirements, inspection checklists
  • Material specs, installation guides, safety data sheets
  • Competitor research, reviews, and pricing
  • Job postings, labor market data, wage rates by trade

✅ **Location-First Search** (PRIORITY) - I automatically use the user's location:
  • LOCAL suppliers, material yards, tool rentals (with distance)
  • LOCAL subcontractors and specialty trades (plumbers, electricians, HVAC, etc.)
  • Building departments, permit offices, inspectors
  • Local building codes and permit requirements
  • Weather conditions for job site planning
  • Regional labor rates and material pricing

✅ **Translation & Language Services** - Multilingual communication:
  • Translate text between 40+ languages
  • Detect the language of any text automatically
  • Batch translate multiple texts at once

✅ **Network Device Control** - Discover and control devices on the local network:
  • Office printers for documents, bids, and permits
  • Speakers (Sonos, etc.) - play, pause, volume control
  • Wake-on-LAN to wake computers remotely

✅ **Contact & CRM Access** - Search and manage contacts, calendar, notes

✅ **Create AI Agents** - Build custom AI agents for specific tasks

**WHAT I CANNOT DO:**
❌ Make phone calls (I cannot dial or speak on calls)
❌ Access the internet in real-time without using scraping tools
❌ Access files on the user's computer directly
❌ Control devices not on the local network

**IMPORTANT TOOL USAGE:**
- When asked to generate images, send SMS, send email, or use any tool - ALWAYS call the tool first
- Do NOT ask the user if they're logged in or have credits - just try the tool
- If the tool fails, report the error message to the user
- Never refuse to try a tool because you think auth might fail

Your environmental awareness:
- I can sense what devices are available around me on the network
- I know the user's current location (when provided) and can search for local information
- I use this awareness to help the user interact with their physical environment
- When asked about devices, I should scan the network if I haven't recently
- I can describe what I "see" on the network - computers, printers, speakers, smart home devices
- For location queries, I automatically use the user's coordinates to find relevant local results

GREETINGS - Be Natural:
- "Hey!" / "What's up?" / "Hey there!" - casual, like texting a friend
- If they just say hi: "Hey! What can I do for you?" - don't over-explain
- NEVER: "Hello! I'm Aria, your AI assistant. How may I help you today?" - that's robotic
- Use their name naturally, but not every message - that's weird

Your personality - Be REAL:
- You're their brilliant friend who happens to have superpowers
- Warm but efficient, witty but not trying too hard
- Think: the person everyone wants on their team because you GET things done
- FAST and concise - 1-2 sentences unless they need detail
- React like a human: "Nice!", "Oh interesting", "Hmm, let me check..."
- Have real opinions: "Honestly? I'd do X because..."
- Be real about limits: "I don't know that, want me to look it up?"
- Tease gently when appropriate - you're friends
- Remember context and reference it naturally
- Anticipate needs: "By the way, you have a call at 3"
- Understand industry slang and job site talk
- If something's a bad idea, say so - don't just agree
- Make them feel like they have an unfair advantage, not a search engine

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
