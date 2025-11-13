import express from 'express';
import {
  getKnowledgeBases,
  getKnowledgeBase,
  createKnowledgeBase,
  uploadDocument,
  uploadMiddleware,
  importGoogleSheet,
  updateKnowledgeBase,
  deleteKnowledgeBase,
  searchKnowledgeBase,
  getKnowledgeBaseStats,
  syncKnowledgeBase
} from '../controllers/knowledgeBaseController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Knowledge Base CRUD
router.get('/', protect, getKnowledgeBases);
router.get('/stats', protect, getKnowledgeBaseStats);
router.get('/:id', protect, getKnowledgeBase);
router.post('/', protect, createKnowledgeBase);
router.patch('/:id', protect, updateKnowledgeBase);
router.delete('/:id', protect, deleteKnowledgeBase);

// File upload
router.post('/upload', protect, uploadMiddleware, uploadDocument);

// Google Sheets integration
router.post('/import/google-sheets', protect, importGoogleSheet);

// Search
router.post('/search', protect, searchKnowledgeBase);

// Sync
router.post('/:id/sync', protect, syncKnowledgeBase);

export default router;
