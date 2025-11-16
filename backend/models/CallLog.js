import mongoose from 'mongoose';

const callLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  agentId: {
    type: mongoose.Schema.Types.Mixed, // Can be ObjectId or string (ElevenLabs agent_id)
    required: false, // Optional for test calls
    index: true
  },
  callerName: String,
  callerPhone: String, // Optional for outbound calls
  phoneNumber: String, // Phone number called (for outbound) or caller (for inbound)
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead'
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    required: true
  },
  duration: {
    type: Number, // Duration in seconds
    default: 0
  },
  durationMinutes: {
    type: Number, // Duration in minutes (rounded up for billing)
    default: 0
  },
  cost: {
    costPerMinute: {
      type: Number, // ElevenLabs cost per minute (e.g., 0.10)
      default: 0.10
    },
    totalCost: {
      type: Number, // Total platform cost for this call
      default: 0
    },
    userCharge: {
      type: Number, // What customer pays (if overage)
      default: 0
    }
  },
  transcript: {
    type: String,
    default: ''
  },
  recordingUrl: String,
  status: {
    type: String,
    enum: ['initiated', 'ringing', 'in-progress', 'completed', 'failed', 'no-answer', 'busy', 'canceled'],
    default: 'initiated'
  },
  leadsCapured: {
    name: String,
    email: String,
    phone: String,
    interest: String,
    qualified: Boolean,
    appointmentBooked: Boolean,
    appointmentDate: Date,
    paymentCaptured: Boolean,
    paymentAmount: Number
  },
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative'],
    default: 'neutral'
  },
  elevenLabsCallId: String,
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

callLogSchema.index({ userId: 1, createdAt: -1 });
callLogSchema.index({ agentId: 1, createdAt: -1 });

const CallLog = mongoose.model('CallLog', callLogSchema);

export default CallLog;
