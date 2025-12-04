import mongoose from 'mongoose';
import dotenv from 'dotenv';
import twilio from 'twilio';
import User from '../models/User.js';
import PhoneNumber from '../models/PhoneNumber.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

/**
 * Add all existing Twilio numbers to admin user account
 * Admin: help.voicenowcrm@gmail.com
 */

async function addAdminTwilioNumbers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Initialize Twilio client
    const twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // Find admin user
    const adminEmail = 'help.voicenowcrm@gmail.com';
    const admin = await User.findOne({ email: adminEmail });

    if (!admin) {
      console.error(`❌ Admin user not found: ${adminEmail}`);
      console.log('Creating admin user...');

      // Create admin user if doesn't exist
      const newAdmin = await User.create({
        email: adminEmail,
        password: 'TempPassword123!', // User should change this
        company: 'VoiceNow CRM AI',
        plan: 'enterprise',
        subscriptionStatus: 'active'
      });

      console.log('✅ Created admin user:', adminEmail);
      admin = newAdmin;
    }

    console.log(`\n📱 Fetching Twilio numbers for account: ${process.env.TWILIO_ACCOUNT_SID}\n`);

    // Fetch all incoming phone numbers from Twilio
    const twilioNumbers = await twilioClient.incomingPhoneNumbers.list();

    console.log(`Found ${twilioNumbers.length} numbers in Twilio account:\n`);

    let addedCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    for (const twilioNumber of twilioNumbers) {
      console.log(`\n📞 Processing: ${twilioNumber.friendlyName || twilioNumber.phoneNumber}`);
      console.log(`   Number: ${twilioNumber.phoneNumber}`);
      console.log(`   SID: ${twilioNumber.sid}`);
      console.log(`   Capabilities: Voice=${twilioNumber.capabilities.voice}, SMS=${twilioNumber.capabilities.sms}, MMS=${twilioNumber.capabilities.mms}`);

      // Check if number already exists in database
      let existingNumber = await PhoneNumber.findOne({
        phoneNumber: twilioNumber.phoneNumber
      });

      if (existingNumber) {
        // Update if it belongs to a different user
        if (existingNumber.userId.toString() !== admin._id.toString()) {
          console.log(`   ⚠️  Number exists but belongs to different user, updating to admin...`);

          existingNumber.userId = admin._id;
          existingNumber.twilioSid = twilioNumber.sid;
          existingNumber.friendlyName = twilioNumber.friendlyName || twilioNumber.phoneNumber;
          existingNumber.capabilities = {
            voice: twilioNumber.capabilities.voice,
            sms: twilioNumber.capabilities.sms,
            mms: twilioNumber.capabilities.mms
          };
          existingNumber.status = 'active';
          existingNumber.type = 'admin';
          existingNumber.monthlyCost = 0; // Free for admin

          await existingNumber.save();
          updatedCount++;
          console.log(`   ✅ Updated and assigned to admin`);
        } else {
          console.log(`   ⏭️  Already exists for admin, skipping`);
          skippedCount++;
        }
      } else {
        // Add new number to admin account
        const newNumber = await PhoneNumber.create({
          userId: admin._id,
          phoneNumber: twilioNumber.phoneNumber,
          twilioSid: twilioNumber.sid,
          type: 'admin', // Mark as admin number (free, not sold to customers)
          status: 'active',
          friendlyName: twilioNumber.friendlyName || twilioNumber.phoneNumber,
          capabilities: {
            voice: twilioNumber.capabilities.voice,
            sms: twilioNumber.capabilities.sms,
            mms: twilioNumber.capabilities.mms
          },
          monthlyCost: 0, // Free for admin
          voiceUrl: twilioNumber.voiceUrl,
          smsUrl: twilioNumber.smsUrl
        });

        addedCount++;
        console.log(`   ✅ Added to admin account`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Added: ${addedCount} numbers`);
    console.log(`♻️  Updated: ${updatedCount} numbers`);
    console.log(`⏭️  Skipped: ${skippedCount} numbers (already exist)`);
    console.log(`📱 Total Twilio numbers: ${twilioNumbers.length}`);
    console.log(`\n👤 Admin: ${adminEmail}`);
    console.log('='.repeat(60));

    // Show admin's phone numbers
    const adminNumbers = await PhoneNumber.find({ userId: admin._id });
    console.log(`\n📞 Admin's Phone Numbers (${adminNumbers.length} total):\n`);

    adminNumbers.forEach((num, idx) => {
      console.log(`${idx + 1}. ${num.phoneNumber}`);
      console.log(`   Friendly Name: ${num.friendlyName}`);
      console.log(`   Type: ${num.type}`);
      console.log(`   Status: ${num.status}`);
      console.log(`   Capabilities: Voice=${num.capabilities.voice}, SMS=${num.capabilities.sms}, MMS=${num.capabilities.mms}`);
      if (num.assignedAgent) {
        console.log(`   Assigned Agent: ${num.assignedAgent}`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed');
    process.exit(0);
  }
}

// Run the script
addAdminTwilioNumbers();
