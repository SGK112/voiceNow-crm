const mongoose = require('mongoose');
require('dotenv').config({ path: '/Users/homepc/voiceFlow-crm-1/backend/.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

  // Try to find the specific user
  const user = await User.findById('673e3675076b7be58ca5744b');
  console.log('User found:', user ? 'YES' : 'NO');
  if (user) {
    console.log('User email:', user.email);
    console.log('User name:', user.name || user.firstName);
    console.log('Media credits:', user.mediaCredits || 'Not set');
  }

  // List all users
  console.log('\nAll users:');
  const users = await User.find({}).select('_id email').limit(10);
  users.forEach(u => console.log('  -', u._id.toString(), u.email));

  mongoose.disconnect();
}).catch(err => console.error(err));
