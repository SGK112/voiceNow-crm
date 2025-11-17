import express from 'express';
import * as phoneNumberController from '../controllers/phoneNumberController.js';
import { protect } from '../middleware/auth.js';
import { requirePlan } from '../middleware/subscriptionGate.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/phone-numbers
 * @desc    Get all user's phone numbers
 * @access  Private
 */
router.get('/', phoneNumberController.getPhoneNumbers);

/**
 * @route   POST /api/phone-numbers/search
 * @desc    Search available phone numbers (local, toll-free, international)
 * @body    { type, areaCode, country, contains, capabilities }
 * @access  Private (Starter+)
 */
router.post('/search', requirePlan('starter'), phoneNumberController.searchNumbers);

/**
 * @route   GET /api/phone-numbers/my-numbers
 * @desc    Get user's purchased phone numbers
 * @access  Private
 */
router.get('/my-numbers', phoneNumberController.getMyNumbers);

/**
 * @route   POST /api/phone-numbers/bulk-purchase
 * @desc    Purchase multiple phone numbers at once
 * @body    { phoneNumbers: ['+1...', '+1...'] }
 * @access  Private (Starter+)
 */
router.post('/bulk-purchase', requirePlan('starter'), phoneNumberController.bulkPurchase);

/**
 * @route   GET /api/phone-numbers/available
 * @desc    Search available phone numbers (LEGACY)
 * @query   areaCode - Area code to search (e.g., 415)
 * @access  Private (Starter+)
 */
router.get('/available', requirePlan('starter'), phoneNumberController.searchAvailableNumbers);

/**
 * @route   POST /api/phone-numbers/purchase
 * @desc    Purchase a phone number
 * @body    { phoneNumber: '+14155551234' }
 * @access  Private (Starter+)
 */
router.post('/purchase', requirePlan('starter'), phoneNumberController.purchaseNumber);

/**
 * @route   POST /api/phone-numbers/port
 * @desc    Port an existing phone number
 * @body    { phoneNumber, currentProvider, accountNumber }
 * @access  Private (Starter+)
 */
router.post('/port', requirePlan('starter'), phoneNumberController.portNumber);

/**
 * @route   PATCH /api/phone-numbers/:id
 * @desc    Update phone number (assign agent, etc.)
 * @access  Private
 */
router.patch('/:id', phoneNumberController.updatePhoneNumber);

/**
 * @route   DELETE /api/phone-numbers/:id
 * @desc    Release/delete phone number
 * @access  Private
 */
router.delete('/:id', phoneNumberController.deletePhoneNumber);

export default router;
