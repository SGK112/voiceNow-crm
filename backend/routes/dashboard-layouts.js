import express from 'express';
import DashboardLayout from '../models/DashboardLayout.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Default dashboard layout
const defaultWidgets = [
  { id: 'lead-stats-1', type: 'lead_stats', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
  { id: 'revenue-chart-1', type: 'revenue_chart', x: 3, y: 0, w: 6, h: 3, minW: 4, minH: 2 },
  { id: 'quick-actions-1', type: 'quick_actions', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
  { id: 'pipeline-1', type: 'pipeline', x: 0, y: 2, w: 6, h: 3, minW: 4, minH: 3 },
  { id: 'upcoming-appointments-1', type: 'upcoming_appointments', x: 6, y: 3, w: 6, h: 3, minW: 3, minH: 2 },
  { id: 'recent-calls-1', type: 'recent_calls', x: 0, y: 5, w: 6, h: 3, minW: 3, minH: 2 },
  { id: 'ai-insights-1', type: 'ai_insights', x: 6, y: 6, w: 6, h: 3, minW: 3, minH: 2 }
];

// Get user's dashboard layout
router.get('/', protect, async (req, res) => {
  try {
    let layout = await DashboardLayout.findOne({ userId: req.user.userId });

    // Create default layout if none exists
    if (!layout) {
      layout = new DashboardLayout({
        userId: req.user.userId,
        name: 'My Dashboard',
        widgets: defaultWidgets,
        isDefault: true
      });
      await layout.save();
    }

    res.json(layout);
  } catch (error) {
    console.error('Error fetching dashboard layout:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard layout' });
  }
});

// Update dashboard layout
router.put('/', protect, async (req, res) => {
  try {
    const { name, widgets, cols, rowHeight, theme } = req.body;

    let layout = await DashboardLayout.findOne({ userId: req.user.userId });

    if (!layout) {
      layout = new DashboardLayout({
        userId: req.user.userId,
        widgets: widgets || defaultWidgets
      });
    }

    if (name !== undefined) layout.name = name;
    if (widgets !== undefined) layout.widgets = widgets;
    if (cols !== undefined) layout.cols = cols;
    if (rowHeight !== undefined) layout.rowHeight = rowHeight;
    if (theme !== undefined) layout.theme = theme;

    await layout.save();

    res.json(layout);
  } catch (error) {
    console.error('Error updating dashboard layout:', error);
    res.status(500).json({ error: 'Failed to update dashboard layout' });
  }
});

// Add widget to dashboard
router.post('/widgets', protect, async (req, res) => {
  try {
    const { type, x, y, w, h, minW, minH, config } = req.body;

    let layout = await DashboardLayout.findOne({ userId: req.user.userId });

    if (!layout) {
      layout = new DashboardLayout({
        userId: req.user.userId,
        widgets: []
      });
    }

    const widgetId = `${type}-${Date.now()}`;
    const newWidget = {
      id: widgetId,
      type,
      x: x || 0,
      y: y || 0,
      w: w || 3,
      h: h || 2,
      minW: minW || 2,
      minH: minH || 2,
      config: config || new Map()
    };

    layout.widgets.push(newWidget);
    await layout.save();

    res.status(201).json({ widget: newWidget, layout });
  } catch (error) {
    console.error('Error adding widget:', error);
    res.status(500).json({ error: 'Failed to add widget' });
  }
});

// Update widget
router.put('/widgets/:widgetId', protect, async (req, res) => {
  try {
    const { widgetId } = req.params;
    const { x, y, w, h, config, isVisible } = req.body;

    const layout = await DashboardLayout.findOne({ userId: req.user.userId });

    if (!layout) {
      return res.status(404).json({ error: 'Dashboard layout not found' });
    }

    const widget = layout.widgets.find(w => w.id === widgetId);
    if (!widget) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    if (x !== undefined) widget.x = x;
    if (y !== undefined) widget.y = y;
    if (w !== undefined) widget.w = w;
    if (h !== undefined) widget.h = h;
    if (config !== undefined) widget.config = config;
    if (isVisible !== undefined) widget.isVisible = isVisible;

    await layout.save();

    res.json({ widget, layout });
  } catch (error) {
    console.error('Error updating widget:', error);
    res.status(500).json({ error: 'Failed to update widget' });
  }
});

// Remove widget
router.delete('/widgets/:widgetId', protect, async (req, res) => {
  try {
    const { widgetId } = req.params;

    const layout = await DashboardLayout.findOne({ userId: req.user.userId });

    if (!layout) {
      return res.status(404).json({ error: 'Dashboard layout not found' });
    }

    layout.widgets = layout.widgets.filter(w => w.id !== widgetId);
    await layout.save();

    res.json({ message: 'Widget removed successfully', layout });
  } catch (error) {
    console.error('Error removing widget:', error);
    res.status(500).json({ error: 'Failed to remove widget' });
  }
});

// Reset to default layout
router.post('/reset', protect, async (req, res) => {
  try {
    let layout = await DashboardLayout.findOne({ userId: req.user.userId });

    if (!layout) {
      layout = new DashboardLayout({
        userId: req.user.userId
      });
    }

    layout.widgets = defaultWidgets;
    layout.name = 'My Dashboard';
    layout.cols = 12;
    layout.rowHeight = 100;
    layout.isDefault = true;

    await layout.save();

    res.json(layout);
  } catch (error) {
    console.error('Error resetting dashboard:', error);
    res.status(500).json({ error: 'Failed to reset dashboard' });
  }
});

// Get available widget types
router.get('/widget-types', protect, async (req, res) => {
  try {
    const widgetTypes = [
      {
        type: 'lead_stats',
        name: 'Lead Statistics',
        description: 'Overview of lead counts and conversion rates',
        defaultSize: { w: 3, h: 2 }
      },
      {
        type: 'revenue_chart',
        name: 'Revenue Chart',
        description: 'Revenue trends over time',
        defaultSize: { w: 6, h: 3 }
      },
      {
        type: 'recent_calls',
        name: 'Recent Calls',
        description: 'Latest call activity',
        defaultSize: { w: 6, h: 3 }
      },
      {
        type: 'upcoming_appointments',
        name: 'Upcoming Appointments',
        description: 'Scheduled meetings and calls',
        defaultSize: { w: 6, h: 3 }
      },
      {
        type: 'tasks',
        name: 'Tasks',
        description: 'Your pending tasks',
        defaultSize: { w: 3, h: 3 }
      },
      {
        type: 'pipeline',
        name: 'Sales Pipeline',
        description: 'Lead pipeline visualization',
        defaultSize: { w: 6, h: 3 }
      },
      {
        type: 'team_activity',
        name: 'Team Activity',
        description: 'Recent team member activity',
        defaultSize: { w: 6, h: 3 }
      },
      {
        type: 'ai_insights',
        name: 'AI Insights',
        description: 'AI-generated insights and recommendations',
        defaultSize: { w: 6, h: 3 }
      },
      {
        type: 'quick_actions',
        name: 'Quick Actions',
        description: 'Frequently used actions',
        defaultSize: { w: 3, h: 2 }
      },
      {
        type: 'calendar',
        name: 'Calendar',
        description: 'Calendar view of appointments',
        defaultSize: { w: 6, h: 4 }
      },
      {
        type: 'notes',
        name: 'Recent Notes',
        description: 'Latest notes and updates',
        defaultSize: { w: 6, h: 3 }
      },
      {
        type: 'recent_estimates',
        name: 'Recent Estimates',
        description: 'Latest estimates sent',
        defaultSize: { w: 6, h: 3 }
      },
      {
        type: 'recent_invoices',
        name: 'Recent Invoices',
        description: 'Latest invoices',
        defaultSize: { w: 6, h: 3 }
      },
      {
        type: 'conversation_history',
        name: 'AI Conversations',
        description: 'Recent AI conversation history',
        defaultSize: { w: 6, h: 3 }
      }
    ];

    res.json(widgetTypes);
  } catch (error) {
    console.error('Error fetching widget types:', error);
    res.status(500).json({ error: 'Failed to fetch widget types' });
  }
});

export default router;
