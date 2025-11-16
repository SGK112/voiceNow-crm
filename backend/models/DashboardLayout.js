import mongoose from 'mongoose';

const widgetSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    enum: [
      'lead_stats',
      'revenue_chart',
      'recent_calls',
      'upcoming_appointments',
      'tasks',
      'pipeline',
      'team_activity',
      'ai_insights',
      'quick_actions',
      'calendar',
      'notes',
      'recent_estimates',
      'recent_invoices',
      'conversation_history'
    ],
    required: true
  },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  w: { type: Number, required: true },
  h: { type: Number, required: true },
  minW: { type: Number, default: 2 },
  minH: { type: Number, default: 2 },
  config: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  isVisible: {
    type: Boolean,
    default: true
  }
});

const dashboardLayoutSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    default: 'My Dashboard'
  },
  widgets: [widgetSchema],
  cols: {
    type: Number,
    default: 12
  },
  rowHeight: {
    type: Number,
    default: 100
  },
  theme: {
    type: String,
    enum: ['light', 'dark', 'auto'],
    default: 'auto'
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const DashboardLayout = mongoose.model('DashboardLayout', dashboardLayoutSchema);

export default DashboardLayout;
