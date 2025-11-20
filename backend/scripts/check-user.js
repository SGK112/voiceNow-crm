import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

await mongoose.connect(process.env.MONGODB_URI);

const user = await User.findById('6911275cbdeb3619658f8076');

if (user) {
  console.log('👤 User who owns the agent:');
  console.log('   ID:', user._id);
  console.log('   Email:', user.email);
  console.log('   Name:', user.name);
  console.log('');
  console.log('🔑 Login to VoiceFlow CRM with this email!');
  console.log('   http://localhost:5173/login');
} else {
  console.log('User not found');
}

// List all users
console.log('\n📋 All users in database:');
const allUsers = await User.find({}).select('email name _id');
allUsers.forEach(u => {
  console.log(`   ${u.email} (ID: ${u._id})`);
});

await mongoose.disconnect();
