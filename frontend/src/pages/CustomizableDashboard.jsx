import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import GridLayout from 'react-grid-layout';
import api from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Plus,
  RotateCcw,
  Save,
  Edit,
  X,
  GripVertical,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Import widget components
import LeadStatsWidget from '@/components/dashboard/LeadStatsWidget';
import RevenueChartWidget from '@/components/dashboard/RevenueChartWidget';
import RecentCallsWidget from '@/components/dashboard/RecentCallsWidget';
import QuickActionsWidget from '@/components/dashboard/QuickActionsWidget';
import PipelineWidget from '@/components/dashboard/PipelineWidget';
import UpcomingAppointmentsWidget from '@/components/dashboard/UpcomingAppointmentsWidget';
import AIInsightsWidget from '@/components/dashboard/AIInsightsWidget';

// Import react-grid-layout CSS
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const WIDGET_COMPONENTS = {
  lead_stats: LeadStatsWidget,
  revenue_chart: RevenueChartWidget,
  recent_calls: RecentCallsWidget,
  quick_actions: QuickActionsWidget,
  pipeline: PipelineWidget,
  upcoming_appointments: UpcomingAppointmentsWidget,
  ai_insights: AIInsightsWidget
};

export default function CustomizableDashboard() {
  const [isEditing, setIsEditing] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const queryClient = useQueryClient();

  // Fetch dashboard layout
  const { data: layoutData, isLoading } = useQuery({
    queryKey: ['dashboard-layout'],
    queryFn: async () => {
      const res = await api.get('/dashboard-layouts');
      return res.data;
    }
  });

  // Fetch available widget types
  const { data: widgetTypes = [] } = useQuery({
    queryKey: ['widget-types'],
    queryFn: async () => {
      const res = await api.get('/dashboard-layouts/widget-types');
      return res.data;
    }
  });

  // Update layout mutation
  const updateLayoutMutation = useMutation({
    mutationFn: async (widgets) => {
      const res = await api.put('/dashboard-layouts', { widgets });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-layout'] });
    }
  });

  // Add widget mutation
  const addWidgetMutation = useMutation({
    mutationFn: async (widgetType) => {
      const res = await api.post('/dashboard-layouts/widgets', {
        type: widgetType,
        x: 0,
        y: Infinity, // Add to bottom
        w: 3,
        h: 2
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-layout'] });
      setShowAddWidget(false);
    }
  });

  // Remove widget mutation
  const removeWidgetMutation = useMutation({
    mutationFn: async (widgetId) => {
      const res = await api.delete(`/dashboard-layouts/widgets/${widgetId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-layout'] });
    }
  });

  // Toggle widget visibility mutation
  const toggleWidgetMutation = useMutation({
    mutationFn: async ({ widgetId, isVisible }) => {
      const res = await api.put(`/dashboard-layouts/widgets/${widgetId}`, {
        isVisible: !isVisible
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-layout'] });
    }
  });

  // Reset to default layout
  const resetLayoutMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/dashboard-layouts/reset');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-layout'] });
    }
  });

  const handleLayoutChange = (newLayout) => {
    if (!isEditing || !layoutData) return;

    const updatedWidgets = layoutData.widgets.map((widget) => {
      const layoutItem = newLayout.find((item) => item.i === widget.id);
      if (layoutItem) {
        return {
          ...widget,
          x: layoutItem.x,
          y: layoutItem.y,
          w: layoutItem.w,
          h: layoutItem.h
        };
      }
      return widget;
    });

    // Don't update on every drag, only when needed
    // updateLayoutMutation.mutate(updatedWidgets);
  };

  const handleSaveLayout = () => {
    if (layoutData?.widgets) {
      updateLayoutMutation.mutate(layoutData.widgets);
      setIsEditing(false);
    }
  };

  const handleAddWidget = (widgetType) => {
    addWidgetMutation.mutate(widgetType);
  };

  const handleRemoveWidget = (widgetId) => {
    if (confirm('Are you sure you want to remove this widget?')) {
      removeWidgetMutation.mutate(widgetId);
    }
  };

  const handleToggleVisibility = (widgetId, isVisible) => {
    toggleWidgetMutation.mutate({ widgetId, isVisible });
  };

  const handleResetLayout = () => {
    if (confirm('Are you sure you want to reset to the default layout? This cannot be undone.')) {
      resetLayoutMutation.mutate();
      setIsEditing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const layout = (layoutData?.widgets || [])
    .filter(w => w.isVisible !== false)
    .map((widget) => ({
      i: widget.id,
      x: widget.x,
      y: widget.y,
      w: widget.w,
      h: widget.h,
      minW: widget.minW || 2,
      minH: widget.minH || 2
    }));

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Top Toolbar */}
      <div className="border-b border-border bg-card px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
            <Settings className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Customizable Dashboard</h1>
            <p className="text-xs text-muted-foreground">
              {isEditing ? 'Edit mode - Drag and resize widgets' : 'View mode'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Dialog open={showAddWidget} onOpenChange={setShowAddWidget}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Widget
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Widget</DialogTitle>
                    <DialogDescription>
                      Choose a widget to add to your dashboard
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 gap-2 mt-4">
                    {widgetTypes.map((type) => (
                      <Button
                        key={type.type}
                        variant="outline"
                        className="justify-start h-auto p-4"
                        onClick={() => handleAddWidget(type.type)}
                      >
                        <div>
                          <div className="font-medium">{type.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {type.description}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline" size="sm" onClick={handleResetLayout}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>

              <Button variant="default" size="sm" onClick={handleSaveLayout}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>

              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="default" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Customize
            </Button>
          )}
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="flex-1 overflow-auto p-6">
        <GridLayout
          className="layout"
          layout={layout}
          cols={12}
          rowHeight={100}
          width={1200}
          isDraggable={isEditing}
          isResizable={isEditing}
          onLayoutChange={handleLayoutChange}
          compactType="vertical"
          preventCollision={false}
          margin={[16, 16]}
        >
          {(layoutData?.widgets || [])
            .filter(w => w.isVisible !== false)
            .map((widget) => {
              const WidgetComponent = WIDGET_COMPONENTS[widget.type];

              return (
                <div key={widget.id} className="relative">
                  {isEditing && (
                    <>
                      {/* Drag Handle */}
                      <div className="absolute top-2 left-2 z-10 cursor-move bg-background/80 backdrop-blur-sm rounded px-2 py-1 shadow-sm flex items-center gap-1">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline" className="text-xs">
                          {widget.type.replace('_', ' ')}
                        </Badge>
                      </div>

                      {/* Widget Controls */}
                      <div className="absolute top-2 right-2 z-10 flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 bg-background/80 backdrop-blur-sm shadow-sm"
                          onClick={() => handleToggleVisibility(widget.id, widget.isVisible)}
                        >
                          {widget.isVisible !== false ? (
                            <Eye className="h-3 w-3" />
                          ) : (
                            <EyeOff className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 bg-background/80 backdrop-blur-sm shadow-sm"
                          onClick={() => handleRemoveWidget(widget.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Widget Content */}
                  <div className="h-full">
                    {WidgetComponent ? (
                      <WidgetComponent />
                    ) : (
                      <Card className="h-full">
                        <CardContent className="flex items-center justify-center h-full">
                          <p className="text-muted-foreground">Widget not found</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              );
            })}
        </GridLayout>
      </div>
    </div>
  );
}
