import KnowledgeBase from '../models/KnowledgeBase.js';
import ragService from '../services/ragService.js';
import cloudinaryService from '../services/cloudinaryService.js';
import googleSheetsService from '../services/googleSheetsService.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, DOC, DOCX, TXT, CSV, XLS, XLSX'));
    }
  }
});

/**
 * Get all knowledge bases for user
 */
export const getKnowledgeBases = async (req, res) => {
  try {
    const { type, category, status, search } = req.query;

    const filter = { userId: req.user._id };

    if (type) filter.type = type;
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const knowledgeBases = await KnowledgeBase.find(filter)
      .sort({ createdAt: -1 })
      .select('-content.chunks'); // Exclude embeddings for list view

    res.json(knowledgeBases);
  } catch (error) {
    console.error('Get knowledge bases error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get single knowledge base by ID
 */
export const getKnowledgeBase = async (req, res) => {
  try {
    const kb = await KnowledgeBase.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate('usage.linkedAgents', 'name type');

    if (!kb) {
      return res.status(404).json({ message: 'Knowledge base not found' });
    }

    // Update last accessed
    kb.usage.lastAccessedAt = new Date();
    await kb.save();

    res.json(kb);
  } catch (error) {
    console.error('Get knowledge base error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Create knowledge base from text
 */
export const createKnowledgeBase = async (req, res) => {
  try {
    const { name, description, content, type, category, tags } = req.body;

    if (!name || !content) {
      return res.status(400).json({ message: 'Name and content are required' });
    }

    const kb = await KnowledgeBase.create({
      userId: req.user._id,
      name,
      description,
      type: type || 'text',
      content: {
        rawText: content,
        summary: description || ''
      },
      category: category || 'other',
      tags: tags || [],
      status: 'pending'
    });

    // Process in background
    ragService.processKnowledgeBase(kb._id).catch(err => {
      console.error('Background processing error:', err);
    });

    res.status(201).json(kb);
  } catch (error) {
    console.error('Create knowledge base error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Upload document to knowledge base
 */
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { name, description, category, tags } = req.body;

    // Upload to Cloudinary and create knowledge base
    const result = await cloudinaryService.uploadDocument(
      req.user._id,
      req.file.path,
      {
        name: name || req.file.originalname,
        fileName: req.file.originalname,
        description,
        category,
        tags: tags ? JSON.parse(tags) : []
      }
    );

    // Clean up temp file
    fs.unlinkSync(req.file.path);

    // Process in background
    ragService.processKnowledgeBase(result.knowledgeBase._id).catch(err => {
      console.error('Background processing error:', err);
    });

    res.status(201).json({
      knowledgeBase: result.knowledgeBase,
      uploadedFile: {
        url: result.upload.url,
        size: result.upload.bytes,
        format: result.upload.format
      }
    });
  } catch (error) {
    console.error('Upload document error:', error);
    // Clean up temp file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Import from Google Sheets
 */
export const importGoogleSheet = async (req, res) => {
  try {
    const { spreadsheetId, sheetName, name, description, category, importType, accessToken, refreshToken } = req.body;

    if (!spreadsheetId) {
      return res.status(400).json({ message: 'Spreadsheet ID or URL is required' });
    }

    // Extract ID from URL if provided
    const actualSpreadsheetId = googleSheetsService.extractSpreadsheetId(spreadsheetId);

    if (!actualSpreadsheetId) {
      return res.status(400).json({ message: 'Invalid Google Sheets URL or ID' });
    }

    // Initialize OAuth client
    const oauth2Client = googleSheetsService.initializeClient(accessToken, refreshToken);

    if (importType === 'leads') {
      // Import as leads
      const results = await googleSheetsService.importLeadsFromSheet(
        req.user._id,
        actualSpreadsheetId,
        sheetName || 'Sheet1',
        oauth2Client
      );

      res.json({
        message: 'Leads imported successfully',
        results
      });
    } else {
      // Import as knowledge base
      const kb = await googleSheetsService.importAsKnowledgeBase(
        req.user._id,
        actualSpreadsheetId,
        sheetName || 'Sheet1',
        {
          name,
          description,
          category,
          autoSync: req.body.autoSync || false,
          syncFrequency: req.body.syncFrequency || 'manual'
        },
        oauth2Client
      );

      // Process in background
      ragService.processKnowledgeBase(kb._id).catch(err => {
        console.error('Background processing error:', err);
      });

      res.status(201).json(kb);
    }
  } catch (error) {
    console.error('Import Google Sheet error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update knowledge base
 */
export const updateKnowledgeBase = async (req, res) => {
  try {
    const kb = await KnowledgeBase.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!kb) {
      return res.status(404).json({ message: 'Knowledge base not found' });
    }

    const allowedUpdates = ['name', 'description', 'category', 'tags', 'integration'];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'integration') {
          kb.integration = { ...kb.integration, ...req.body[field] };
        } else {
          kb[field] = req.body[field];
        }
      }
    });

    // If content was updated, reprocess
    if (req.body.content) {
      kb.content.rawText = req.body.content;
      kb.status = 'pending';
      await kb.save();

      // Reprocess in background
      ragService.processKnowledgeBase(kb._id).catch(err => {
        console.error('Background reprocessing error:', err);
      });
    } else {
      await kb.save();
    }

    res.json(kb);
  } catch (error) {
    console.error('Update knowledge base error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete knowledge base
 */
export const deleteKnowledgeBase = async (req, res) => {
  try {
    const kb = await KnowledgeBase.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!kb) {
      return res.status(404).json({ message: 'Knowledge base not found' });
    }

    // Delete from Cloudinary if it's a document
    if (kb.type === 'document' && kb.source.fileUrl) {
      try {
        const publicId = kb.source.fileUrl.split('/').pop().split('.')[0];
        await cloudinaryService.deleteFile(publicId, 'raw');
      } catch (error) {
        console.error('Failed to delete from Cloudinary:', error);
      }
    }

    res.json({ message: 'Knowledge base deleted successfully' });
  } catch (error) {
    console.error('Delete knowledge base error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Search knowledge base
 */
export const searchKnowledgeBase = async (req, res) => {
  try {
    const { query, limit, threshold } = req.body;

    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const results = await ragService.searchKnowledgeBase(req.user._id, query, {
      limit: limit || 5,
      threshold: threshold || 0.7
    });

    res.json(results);
  } catch (error) {
    console.error('Search knowledge base error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get knowledge base statistics
 */
export const getKnowledgeBaseStats = async (req, res) => {
  try {
    const stats = await ragService.getKnowledgeBaseStats(req.user._id);
    res.json(stats);
  } catch (error) {
    console.error('Get KB stats error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Sync knowledge base (for auto-sync sources like Google Sheets)
 */
export const syncKnowledgeBase = async (req, res) => {
  try {
    const kb = await KnowledgeBase.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!kb) {
      return res.status(404).json({ message: 'Knowledge base not found' });
    }

    if (kb.type === 'spreadsheet' && kb.source.googleSheetsId) {
      const { accessToken, refreshToken } = req.body;
      const oauth2Client = googleSheetsService.initializeClient(accessToken, refreshToken);

      await googleSheetsService.syncKnowledgeBase(kb, oauth2Client);

      // Reprocess after sync
      await ragService.processKnowledgeBase(kb._id);

      res.json({
        message: 'Knowledge base synced successfully',
        knowledgeBase: kb
      });
    } else {
      res.status(400).json({ message: 'This knowledge base type does not support syncing' });
    }
  } catch (error) {
    console.error('Sync knowledge base error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Export multer middleware
export const uploadMiddleware = upload.single('file');
