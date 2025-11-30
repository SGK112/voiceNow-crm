import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
console.log('Connecting to MongoDB...');

mongoose.connect(mongoUri).then(async () => {
  console.log('Connected to MongoDB');

  // Import models
  const Contact = (await import('../models/Contact.js')).default;
  const UserProfile = (await import('../models/UserProfile.js')).default;
  const User = (await import('../models/User.js')).default;

  // Find or list existing users
  const users = await User.find({}).select('_id email name').limit(5);
  console.log('\nExisting users:');
  for (const u of users) {
    console.log('  - ' + u._id + ': ' + (u.email || u.name || 'no email'));
  }

  // Check existing profiles
  const profiles = await UserProfile.find({}).select('userId personalInfo workInfo').limit(5);
  console.log('\nExisting profiles:');
  for (const p of profiles) {
    console.log('  - userId: ' + p.userId + ', name: ' + (p.personalInfo?.firstName || 'none') + ', company: ' + (p.workInfo?.company || 'none'));
  }

  // Check existing contacts
  const contacts = await Contact.find({}).select('name phone email company user').limit(10);
  console.log('\nExisting contacts:');
  for (const c of contacts) {
    console.log('  - ' + c.name + ': ' + c.phone + ' (user: ' + c.user + ')');
  }

  await mongoose.disconnect();
  console.log('\nDone');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
