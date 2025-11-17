import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth.js';
import {
  initiateLiveCall,
  uploadAndCallBulk,
  getCallStatus
} from '../controllers/callInitiationController.js';

const router = express.Router();

// Configure multer for CSV upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Initiate single live call
router.post('/live-call', protect, initiateLiveCall);

// Upload CSV and initiate bulk calls
router.post('/bulk-upload', protect, upload.single('file'), uploadAndCallBulk);

// Get call status
router.get('/status/:callId', protect, getCallStatus);

export default router;
