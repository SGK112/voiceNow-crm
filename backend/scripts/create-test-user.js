import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

/**
 * Create Test User for Login
 * Email: help.voicenowcrm@gmail.com
 * Password: password123
 */

async function createTestUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const testEmail = 'help.voicenowcrm@gmail.com';
    const testPassword = 'password123';

    // Check if user exists
    const existingUser = await User.findOne({ email: testEmail });

    if (existingUser) {
      console.log(`\n⚠️  User already exists: ${testEmail}`);
      console.log('Updating password to: password123');

      // Update password
      existingUser.password = testPassword;
      await existingUser.save();

      console.log('✅ Password updated successfully!');
    } else {
      // Create new user
      const newUser = await User.create({
        email: testEmail,
        password: testPassword,
        company: 'VoiceNow CRM AI',
        plan: 'enterprise',
        subscriptionStatus: 'active'
      });

      console.log(`\n✅ Test user created successfully!`);
      console.log(`Email: ${newUser.email}`);
      console.log(`Company: ${newUser.company}`);
      console.log(`Plan: ${newUser.plan}`);
    }

    console.log(`\n🔑 LOGIN CREDENTIALS:`);
    console.log(`Email: ${testEmail}`);
    console.log(`Password: ${testPassword}`);
    console.log(`\n📍 Login at: http://localhost:5173/login`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed');
    process.exit(0);
  }
}

createTestUser();
