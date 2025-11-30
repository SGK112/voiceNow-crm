import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
console.log('Connecting to MongoDB...');

mongoose.connect(mongoUri).then(async () => {
  console.log('Connected to MongoDB');

  const Contact = (await import('../models/Contact.js')).default;
  const UserProfile = (await import('../models/UserProfile.js')).default;
  const User = (await import('../models/User.js')).default;

  // Find Josh's user account
  const joshUser = await User.findOne({ email: 'joshb@surprisegranite.com' });
  console.log('\nFound user:', joshUser ? joshUser._id : 'NOT FOUND');

  const userId = joshUser?._id || '6913b021776947444de0638e'; // Fallback to info@ account

  // 1. Update or create UserProfile for Josh (the business owner)
  console.log('\n--- Setting up UserProfile (Business Owner) ---');

  const profileUpdate = {
    userId: userId.toString(),
    personalInfo: {
      firstName: 'Josh',
      lastName: 'Breese',
      fullName: 'Josh Breese',
      displayName: 'Josh',
      email: 'joshb@surprisegranite.com',
      phone: '+14802555887',
      timezone: 'America/Phoenix'
    },
    workInfo: {
      company: 'Surprise Granite',
      position: 'Owner',
      industry: 'Countertops & Home Improvement',
      workEmail: 'joshb@surprisegranite.com',
      workPhone: '+14802555887'
    },
    ariaPreferences: {
      voiceStyle: 'friendly',
      responseLength: 'normal',
      personality: 'helpful'
    }
  };

  const updatedProfile = await UserProfile.findOneAndUpdate(
    { userId: userId.toString() },
    { $set: profileUpdate },
    { upsert: true, new: true }
  );
  console.log('UserProfile updated/created:', updatedProfile.userId);
  console.log('  Name:', updatedProfile.personalInfo?.fullName);
  console.log('  Company:', updatedProfile.workInfo?.company);

  // Also update the 'default' profile for testing without auth
  const defaultProfileUpdate = {
    userId: 'default',
    personalInfo: {
      firstName: 'Josh',
      lastName: 'Breese',
      fullName: 'Josh Breese',
      displayName: 'Josh',
      email: 'joshb@surprisegranite.com',
      phone: '+14802555887',
      timezone: 'America/Phoenix'
    },
    workInfo: {
      company: 'Surprise Granite',
      position: 'Owner',
      industry: 'Countertops & Home Improvement',
      workEmail: 'joshb@surprisegranite.com',
      workPhone: '+14802555887'
    }
  };

  await UserProfile.findOneAndUpdate(
    { userId: 'default' },
    { $set: defaultProfileUpdate },
    { upsert: true, new: true }
  );
  console.log('Default profile also updated');

  // 2. Create Josh as a test contact (so ARIA can call him)
  console.log('\n--- Creating Test Contact (Josh Breese) ---');

  const testContact = {
    user: new mongoose.Types.ObjectId(userId),
    name: 'Josh Breese',
    phone: '+14802555887',
    email: 'joshb@surprisegranite.com',
    company: 'Surprise Granite',
    notes: 'Business owner - TEST CONTACT for ARIA calls. Located in Surprise, AZ.',
    tags: ['owner', 'test', 'vip'],
    importSource: 'manual',
    customFields: new Map([
      ['address', '15464 W Aster Dr, Surprise, AZ 85379'],
      ['role', 'Owner'],
      ['testContact', 'true']
    ])
  };

  // Check if contact already exists
  let existingContact = await Contact.findOne({
    phone: { $regex: '4802555887' }
  });

  if (existingContact) {
    console.log('Contact already exists, updating...');
    existingContact.name = testContact.name;
    existingContact.email = testContact.email;
    existingContact.company = testContact.company;
    existingContact.notes = testContact.notes;
    existingContact.tags = testContact.tags;
    existingContact.user = testContact.user;
    await existingContact.save();
    console.log('Contact updated:', existingContact._id);
  } else {
    const newContact = await Contact.create(testContact);
    console.log('Contact created:', newContact._id);
  }

  // 3. Create a few more test contacts for variety
  console.log('\n--- Creating Additional Test Contacts ---');

  const additionalContacts = [
    {
      name: 'Sarah Johnson',
      phone: '+16025551234',
      email: 'sarah@example.com',
      company: 'ABC Home Builders',
      notes: 'Interested in kitchen countertops. Budget around $5000.',
      tags: ['lead', 'kitchen', 'residential']
    },
    {
      name: 'Mike Rodriguez',
      phone: '+14805559876',
      email: 'mike.r@example.com',
      company: 'Rodriguez Construction',
      notes: 'Commercial contractor. Multiple properties. High volume potential.',
      tags: ['contractor', 'commercial', 'high-value']
    },
    {
      name: 'Emily Chen',
      phone: '+16235558888',
      email: 'emily.chen@example.com',
      company: null,
      notes: 'Bathroom remodel project. Wants quartz countertops.',
      tags: ['lead', 'bathroom', 'residential']
    }
  ];

  for (const contact of additionalContacts) {
    const exists = await Contact.findOne({ phone: contact.phone });
    if (!exists) {
      await Contact.create({
        ...contact,
        user: new mongoose.Types.ObjectId(userId),
        importSource: 'manual'
      });
      console.log('Created contact:', contact.name);
    } else {
      console.log('Contact exists:', contact.name);
    }
  }

  // 4. Summary
  console.log('\n========== SETUP COMPLETE ==========');
  console.log('\nYour Profile (Business Owner):');
  console.log('  Name: Josh Breese');
  console.log('  Company: Surprise Granite');
  console.log('  Phone: +1 (480) 255-5887');
  console.log('  Email: joshb@surprisegranite.com');

  console.log('\nTest Contact (for ARIA to call YOU):');
  console.log('  Name: Josh Breese');
  console.log('  Phone: +1 (480) 255-5887');
  console.log('  Company: Surprise Granite');

  console.log('\nTo test ARIA calling you, say:');
  console.log('  "ARIA, call Josh Breese to follow up on the countertop project"');
  console.log('  or');
  console.log('  "ARIA, call 480-255-5887 to discuss the quote"');

  console.log('\nARIA will now introduce herself as calling on behalf of:');
  console.log('  "Josh Breese from Surprise Granite"');
  console.log('=====================================\n');

  await mongoose.disconnect();
}).catch(err => {
  console.error('Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
