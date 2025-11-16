import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  type: {
    type: String,
    enum: ['call', 'meeting', 'site_visit', 'follow_up', 'consultation', 'other'],
    default: 'meeting'
  },
  startTime: {
    type: Date,
    required: true,
    index: true
  },
  endTime: {
    type: Date,
    required: true
  },
  location: String,
  attendees: [{
    name: String,
    email: String,
    phone: String
  }],
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'],
    default: 'scheduled'
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  reminderTime: Date,
  aiScheduled: {
    type: Boolean,
    default: false
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent'
  },
  callId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CallLog'
  },
  notes: String,
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

appointmentSchema.index({ userId: 1, startTime: 1 });
appointmentSchema.index({ leadId: 1, status: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;
