import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './backend/models/User.js';

dotenv.config();

async function createTestUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if test user exists
    const existingUser = await User.findOne({ email: 'test@test.com' });

    if (existingUser) {
      console.log('✅ Test user already exists');
      console.log('Email: test@test.com');
      console.log('Password: test123');
      process.exit(0);
    }

    // Create test user
    const hashedPassword = await bcrypt.hash('test123', 10);

    const testUser = new User({
      email: 'test@test.com',
      password: hashedPassword,
      company: 'Test Company',
      plan: 'free',
      subscriptionStatus: 'active'
    });

    await testUser.save();
    console.log('✅ Test user created successfully!');
    console.log('Email: test@test.com');
    console.log('Password: test123');
    console.log('\nYou can now login at: http://localhost:5173/login');

    process.exit(0);
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  }
}

createTestUser();
