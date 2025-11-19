import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CallLog from '../models/CallLog.js';

dotenv.config();

await mongoose.connect(process.env.MONGODB_URI);

// Get the last call
const lastCall = await CallLog.findOne().sort({ createdAt: -1 });

if (lastCall) {
  console.log('📞 Last Call:');
  console.log('   ID:', lastCall._id);
  console.log('   Caller:', lastCall.callerName);
  console.log('   Phone:', lastCall.callerPhone);
  console.log('   Duration:', lastCall.duration);
  console.log('   Status:', lastCall.status);
  console.log('');
  console.log('📋 Metadata:');
  console.log(JSON.stringify(lastCall.metadata, null, 2));
} else {
  console.log('No calls found');
}

await mongoose.disconnect();
