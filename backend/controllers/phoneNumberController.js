import PhoneNumber from '../models/PhoneNumber.js';
import User from '../models/User.js';
import twilio from 'twilio';
import Stripe from 'stripe';
import { checkResourceLimit, getResourceLimit } from '../middleware/subscriptionGate.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Initialize Twilio client
 * Uses platform's Twilio credentials (white-labeled)
 */
const getTwilioClient = () => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio credentials not configured');
  }
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
};

/**
 * @route   GET /api/phone-numbers
 * @desc    Get all user's phone numbers
 * @access  Private
 */
export const getPhoneNumbers = async (req, res) => {
  try {
    const phoneNumbers = await PhoneNumber.find({ userId: req.user._id })
      .populate('assignedAgent', 'name type')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      phoneNumbers
    });
  } catch (error) {
    console.error('Error fetching phone numbers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch phone numbers',
      message: error.message
    });
  }
};

/**
 * @route   GET /api/phone-numbers/available
 * @desc    Search available phone numbers from Twilio
 * @query   areaCode - Area code to search (e.g., 415)
 * @query   contains - Number pattern to search for
 * @access  Private (Starter+)
 */
export const searchAvailableNumbers = async (req, res) => {
  try {
    const { areaCode, contains } = req.query;

    if (!areaCode) {
      return res.status(400).json({
        success: false,
        error: 'Area code is required'
      });
    }

    const twilioClient = getTwilioClient();

    // Search for available local numbers
    const searchParams = {
      areaCode: areaCode,
      limit: 20
    };

    if (contains) {
      searchParams.contains = contains;
    }

    const availableNumbers = await twilioClient
      .availablePhoneNumbers('US')
      .local
      .list(searchParams);

    // Format response
    const formattedNumbers = availableNumbers.map(number => ({
      phoneNumber: number.phoneNumber,
      friendlyName: number.friendlyName,
      locality: number.locality,
      region: number.region,
      capabilities: {
        voice: number.capabilities.voice,
        sms: number.capabilities.SMS,
        mms: number.capabilities.MMS
      }
    }));

    res.json({
      success: true,
      numbers: formattedNumbers
    });
  } catch (error) {
    console.error('Error searching available numbers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search available numbers',
      message: error.message
    });
  }
};

/**
 * @route   POST /api/phone-numbers/purchase
 * @desc    Purchase a phone number from Twilio
 * @body    { phoneNumber: '+14155551234', friendlyName: 'Support Line' }
 * @access  Private (Starter+)
 */
export const purchaseNumber = async (req, res) => {
  try {
    const { phoneNumber, friendlyName } = req.body;
    const userId = req.user._id;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    // Check if user has reached their phone number limit
    const currentCount = await PhoneNumber.countDocuments({
      userId,
      status: { $in: ['active', 'porting'] }
    });

    const tier = req.user.subscription?.tier || 'free';
    const limit = getResourceLimit(tier, 'phone_numbers');

    if (currentCount >= limit) {
      return res.status(403).json({
        success: false,
        error: 'Phone number limit reached',
        message: `Your ${tier} plan allows ${limit} phone number(s). Upgrade to add more.`,
        currentCount,
        limit,
        upgradeUrl: `${process.env.CLIENT_URL}/app/settings?tab=billing`
      });
    }

    // Check if number is already in database
    const existingNumber = await PhoneNumber.findOne({ phoneNumber });
    if (existingNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number already exists',
        message: 'This number is already in use'
      });
    }

    const twilioClient = getTwilioClient();

    // Purchase the number from Twilio
    const purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
      phoneNumber: phoneNumber,
      voiceUrl: `${process.env.API_URL}/api/webhooks/twilio/voice`,
      smsUrl: `${process.env.API_URL}/api/webhooks/twilio/sms`,
      voiceMethod: 'POST',
      smsMethod: 'POST',
      friendlyName: friendlyName || phoneNumber
    });

    // Create Stripe subscription item for recurring billing ($2/month)
    let stripeSubscriptionItemId;

    if (req.user.stripeSubscriptionId) {
      const subscriptionItem = await stripe.subscriptionItems.create({
        subscription: req.user.stripeSubscriptionId,
        price_data: {
          currency: 'usd',
          product: process.env.STRIPE_PHONE_NUMBER_PRODUCT_ID || 'prod_phone_number',
          recurring: {
            interval: 'month'
          },
          unit_amount: 200 // $2.00 in cents
        },
        quantity: 1
      });

      stripeSubscriptionItemId = subscriptionItem.id;
    }

    // Save to database
    const newPhoneNumber = await PhoneNumber.create({
      userId,
      phoneNumber: purchasedNumber.phoneNumber,
      twilioSid: purchasedNumber.sid,
      type: 'purchased',
      status: 'active',
      friendlyName: friendlyName || phoneNumber,
      capabilities: {
        voice: purchasedNumber.capabilities.voice,
        sms: purchasedNumber.capabilities.SMS,
        mms: purchasedNumber.capabilities.MMS
      },
      monthlyCost: 2.00,
      stripeSubscriptionItemId
    });

    res.status(201).json({
      success: true,
      message: 'Phone number purchased successfully',
      phoneNumber: newPhoneNumber
    });
  } catch (error) {
    console.error('Error purchasing phone number:', error);

    // Handle Twilio-specific errors
    if (error.code === 21452) {
      return res.status(400).json({
        success: false,
        error: 'Number not available',
        message: 'This phone number is no longer available. Please search again.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to purchase phone number',
      message: error.message
    });
  }
};

/**
 * @route   POST /api/phone-numbers/port
 * @desc    Port an existing phone number to Twilio
 * @body    { phoneNumber, currentProvider, accountNumber, accountPin }
 * @access  Private (Starter+)
 */
export const portNumber = async (req, res) => {
  try {
    const { phoneNumber, currentProvider, accountNumber, accountPin } = req.body;
    const userId = req.user._id;

    if (!phoneNumber || !currentProvider || !accountNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Phone number, current provider, and account number are required'
      });
    }

    // Check if user has reached their phone number limit
    const currentCount = await PhoneNumber.countDocuments({
      userId,
      status: { $in: ['active', 'porting'] }
    });

    const tier = req.user.subscription?.tier || 'free';
    const limit = getResourceLimit(tier, 'phone_numbers');

    if (currentCount >= limit) {
      return res.status(403).json({
        success: false,
        error: 'Phone number limit reached',
        message: `Your ${tier} plan allows ${limit} phone number(s). Upgrade to add more.`,
        currentCount,
        limit
      });
    }

    // Check if number is already in database
    const existingNumber = await PhoneNumber.findOne({ phoneNumber });
    if (existingNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number already exists',
        message: 'This number is already in your account or being ported'
      });
    }

    const twilioClient = getTwilioClient();

    // Submit port request to Twilio
    const portRequest = await twilioClient.numbers.portingPortIns.create({
      phoneNumber: phoneNumber,
      accountNumber: accountNumber,
      accountPin: accountPin || '',
      notificationEmail: req.user.email
    });

    // Charge one-time porting fee ($10)
    if (req.user.stripeCustomerId) {
      await stripe.invoiceItems.create({
        customer: req.user.stripeCustomerId,
        amount: 1000, // $10.00 in cents
        currency: 'usd',
        description: `Phone number porting fee - ${phoneNumber}`
      });

      // Create invoice and attempt to pay it
      const invoice = await stripe.invoices.create({
        customer: req.user.stripeCustomerId,
        auto_advance: true
      });

      await stripe.invoices.pay(invoice.id);
    }

    // Save to database with 'porting' status
    const newPhoneNumber = await PhoneNumber.create({
      userId,
      phoneNumber,
      twilioSid: 'pending', // Will be updated when port completes
      type: 'ported',
      status: 'porting',
      portRequestSid: portRequest.sid,
      currentProvider,
      accountNumber,
      monthlyCost: 2.00
    });

    res.status(201).json({
      success: true,
      message: 'Port request submitted successfully. You will receive an email when the port is complete.',
      phoneNumber: newPhoneNumber,
      estimatedCompletion: '7-10 business days'
    });
  } catch (error) {
    console.error('Error porting phone number:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit port request',
      message: error.message
    });
  }
};

/**
 * @route   PATCH /api/phone-numbers/:id
 * @desc    Update phone number (assign agent, update friendly name, etc.)
 * @access  Private
 */
export const updatePhoneNumber = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedAgent, friendlyName } = req.body;
    const userId = req.user._id;

    const phoneNumber = await PhoneNumber.findOne({ _id: id, userId });

    if (!phoneNumber) {
      return res.status(404).json({
        success: false,
        error: 'Phone number not found'
      });
    }

    // Update fields
    if (assignedAgent !== undefined) {
      phoneNumber.assignedAgent = assignedAgent || null;

      // Get agent name for display
      if (assignedAgent) {
        const Agent = (await import('../models/Agent.js')).default;
        const agent = await Agent.findById(assignedAgent);
        phoneNumber.assignedAgentName = agent?.name || 'Unknown Agent';
      } else {
        phoneNumber.assignedAgentName = null;
      }
    }

    if (friendlyName) {
      phoneNumber.friendlyName = friendlyName;

      // Update friendly name in Twilio
      if (phoneNumber.twilioSid && phoneNumber.twilioSid !== 'pending') {
        const twilioClient = getTwilioClient();
        await twilioClient
          .incomingPhoneNumbers(phoneNumber.twilioSid)
          .update({ friendlyName });
      }
    }

    await phoneNumber.save();

    res.json({
      success: true,
      message: 'Phone number updated successfully',
      phoneNumber
    });
  } catch (error) {
    console.error('Error updating phone number:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update phone number',
      message: error.message
    });
  }
};

/**
 * @route   DELETE /api/phone-numbers/:id
 * @desc    Release/delete phone number
 * @access  Private
 */
export const deletePhoneNumber = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const phoneNumber = await PhoneNumber.findOne({ _id: id, userId });

    if (!phoneNumber) {
      return res.status(404).json({
        success: false,
        error: 'Phone number not found'
      });
    }

    // Release number from Twilio (if not in porting status)
    if (phoneNumber.status !== 'porting' && phoneNumber.twilioSid !== 'pending') {
      try {
        const twilioClient = getTwilioClient();
        await twilioClient
          .incomingPhoneNumbers(phoneNumber.twilioSid)
          .remove();
      } catch (twilioError) {
        console.error('Error releasing number from Twilio:', twilioError);
        // Continue with deletion even if Twilio release fails
      }
    }

    // Cancel Stripe subscription item
    if (phoneNumber.stripeSubscriptionItemId) {
      try {
        await stripe.subscriptionItems.del(phoneNumber.stripeSubscriptionItemId);
      } catch (stripeError) {
        console.error('Error removing Stripe subscription item:', stripeError);
        // Continue with deletion even if Stripe removal fails
      }
    }

    // Delete from database
    await PhoneNumber.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Phone number released successfully'
    });
  } catch (error) {
    console.error('Error deleting phone number:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to release phone number',
      message: error.message
    });
  }
};

/**
 * @route   POST /api/phone-numbers/search
 * @desc    Advanced search for numbers (local, toll-free, international)
 * @access  Private (Starter+)
 */
export const searchNumbers = async (req, res) => {
  try {
    const { type, areaCode, country, contains, capabilities } = req.body;

    const twilioClient = getTwilioClient();

    let searchParams = {
      limit: 50
    };

    if (contains) {
      searchParams.contains = contains;
    }

    let availableNumbers;

    // Search based on type
    switch (type) {
      case 'local':
        if (!areaCode) {
          return res.status(400).json({
            success: false,
            error: 'Area code is required for local numbers'
          });
        }
        searchParams.areaCode = areaCode;
        availableNumbers = await twilioClient
          .availablePhoneNumbers(country || 'US')
          .local
          .list(searchParams);
        break;

      case 'tollfree':
        availableNumbers = await twilioClient
          .availablePhoneNumbers(country || 'US')
          .tollFree
          .list(searchParams);
        break;

      case 'international':
        if (!country || country === 'US') {
          return res.status(400).json({
            success: false,
            error: 'Country code is required for international numbers'
          });
        }
        availableNumbers = await twilioClient
          .availablePhoneNumbers(country)
          .local
          .list(searchParams);
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid search type. Use: local, tollfree, or international'
        });
    }

    // Filter by capabilities if specified
    let filteredNumbers = availableNumbers;
    if (capabilities && capabilities.length > 0) {
      filteredNumbers = availableNumbers.filter(number => {
        return capabilities.every(cap => {
          if (cap === 'voice') return number.capabilities.voice;
          if (cap === 'sms') return number.capabilities.SMS;
          if (cap === 'mms') return number.capabilities.MMS;
          return true;
        });
      });
    }

    // Format response with pricing
    const formattedNumbers = filteredNumbers.map(number => ({
      phoneNumber: number.phoneNumber,
      friendlyName: number.friendlyName,
      locality: number.locality,
      region: number.region,
      isoCountry: number.isoCountry,
      capabilities: {
        voice: number.capabilities.voice,
        SMS: number.capabilities.SMS,
        MMS: number.capabilities.MMS
      },
      price: '1.00' // Standard Twilio pricing ~$1/month
    }));

    res.json({
      success: true,
      numbers: formattedNumbers,
      count: formattedNumbers.length
    });

  } catch (error) {
    console.error('Error searching numbers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search numbers',
      message: error.message
    });
  }
};

/**
 * @route   GET /api/phone-numbers/my-numbers
 * @desc    Get user's purchased numbers with full details
 * @access  Private
 */
export const getMyNumbers = async (req, res) => {
  try {
    const phoneNumbers = await PhoneNumber.find({ userId: req.user._id })
      .populate('assignedAgent', 'name type enabled')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      numbers: phoneNumbers,
      count: phoneNumbers.length
    });

  } catch (error) {
    console.error('Error fetching my numbers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch numbers',
      message: error.message
    });
  }
};

/**
 * @route   POST /api/phone-numbers/bulk-purchase
 * @desc    Purchase multiple phone numbers at once
 * @access  Private (Starter+)
 */
export const bulkPurchase = async (req, res) => {
  try {
    const { phoneNumbers } = req.body;

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Phone numbers array is required'
      });
    }

    // Check resource limit
    const currentCount = await PhoneNumber.countDocuments({ userId: req.user._id });
    const limit = getResourceLimit(req.user.subscriptionTier, 'phoneNumbers');

    if (currentCount + phoneNumbers.length > limit) {
      return res.status(403).json({
        success: false,
        error: 'Phone number limit exceeded',
        message: `Your plan allows ${limit} phone numbers. You have ${currentCount} and are trying to add ${phoneNumbers.length} more.`,
        limit,
        current: currentCount,
        upgradeRequired: true
      });
    }

    const twilioClient = getTwilioClient();
    const results = {
      success: [],
      failed: []
    };

    // Purchase each number
    for (const phoneNumber of phoneNumbers) {
      try {
        const purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
          phoneNumber: phoneNumber,
          voiceUrl: `${process.env.APP_URL}/api/voice/webhook`,
          smsUrl: `${process.env.APP_URL}/api/sms/webhook`,
          voiceMethod: 'POST',
          smsMethod: 'POST'
        });

        // Save to database
        const newNumber = await PhoneNumber.create({
          userId: req.user._id,
          phoneNumber: purchasedNumber.phoneNumber,
          friendlyName: purchasedNumber.friendlyName,
          twilioSid: purchasedNumber.sid,
          capabilities: {
            voice: purchasedNumber.capabilities.voice,
            sms: purchasedNumber.capabilities.SMS,
            mms: purchasedNumber.capabilities.MMS
          },
          voiceUrl: purchasedNumber.voiceUrl,
          smsUrl: purchasedNumber.smsUrl
        });

        results.success.push({
          phoneNumber: phoneNumber,
          sid: purchasedNumber.sid
        });

      } catch (error) {
        console.error(`Error purchasing ${phoneNumber}:`, error);
        results.failed.push({
          phoneNumber: phoneNumber,
          error: error.message
        });
      }
    }

    res.json({
      success: results.failed.length === 0,
      purchased: results.success.length,
      failed: results.failed.length,
      results
    });

  } catch (error) {
    console.error('Error in bulk purchase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to purchase numbers',
      message: error.message
    });
  }
};

export default {
  getPhoneNumbers,
  searchAvailableNumbers,
  searchNumbers,
  getMyNumbers,
  bulkPurchase,
  purchaseNumber,
  portNumber,
  updatePhoneNumber,
  deletePhoneNumber
};
