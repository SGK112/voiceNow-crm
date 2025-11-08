import mongoose from 'mongoose';

const usageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  callsThisMonth: {
    type: Number,
    default: 0
  },
  leadsGenerated: {
    type: Number,
    default: 0
  },
  revenueAttributed: {
    type: Number,
    default: 0
  },
  resetDate: {
    type: Date,
    required: true
  },
  monthlyHistory: [{
    month: String,
    year: Number,
    calls: Number,
    leads: Number,
    revenue: Number
  }]
}, {
  timestamps: true
});

const Usage = mongoose.model('Usage', usageSchema);

export default Usage;
