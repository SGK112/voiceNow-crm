import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Phone, Calendar as CalendarIcon, Clock, Sparkles, User, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function AICallScheduler({ leadId, lead, onSuccess }) {
  const [open, setOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [callDate, setCallDate] = useState(null);
  const [callTime, setCallTime] = useState('');
  const [callType, setCallType] = useState('follow_up');
  const [callInstructions, setCallInstructions] = useState('');
  const [aiAssisted, setAiAssisted] = useState(true);
  const queryClient = useQueryClient();

  // Fetch available agents
  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const res = await api.get('/agents');
      return res.data.filter(agent => agent.status === 'active');
    },
    enabled: open
  });

  // Get AI recommendations for best agent and time
  const { data: recommendations } = useQuery({
    queryKey: ['ai-call-recommendations', leadId],
    queryFn: async () => {
      const res = await api.get(`/ai-conversations/recommend?leadId=${leadId}`);
      return res.data;
    },
    enabled: open && aiAssisted
  });

  // Schedule appointment mutation
  const scheduleCallMutation = useMutation({
    mutationFn: async (data) => {
      // Create appointment
      const appointmentRes = await api.post('/appointments', data);
      const appointment = appointmentRes.data;

      // Schedule AI call if agent selected
      if (selectedAgent) {
        await api.post(`/appointments/${appointment._id}/schedule-ai-call`, {
          agentId: selectedAgent,
          callInstructions: callInstructions || 'Standard follow-up call'
        });
      }

      return appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['leads', leadId] });
      setOpen(false);
      if (onSuccess) onSuccess();

      // Reset form
      setSelectedAgent('');
      setCallDate(null);
      setCallTime('');
      setCallInstructions('');
    }
  });

  const handleSchedule = () => {
    if (!callDate || !callTime) {
      alert('Please select both date and time');
      return;
    }

    const [hours, minutes] = callTime.split(':');
    const startTime = new Date(callDate);
    startTime.setHours(parseInt(hours), parseInt(minutes), 0);

    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + 30); // Default 30 min duration

    scheduleCallMutation.mutate({
      leadId,
      type: callType,
      title: `${callType.replace('_', ' ')} call with ${lead?.name || 'lead'}`,
      description: callInstructions,
      startTime,
      endTime,
      aiScheduled: !!selectedAgent,
      callInstructions
    });
  };

  // AI suggested best times based on lead behavior
  const suggestedTimes = recommendations?.bestTimes || [
    { time: '09:00', reason: 'High engagement morning slot' },
    { time: '14:00', reason: 'Post-lunch availability' },
    { time: '16:00', reason: 'Late afternoon follow-up' }
  ];

  // Get recommended agent
  const recommendedAgent = recommendations?.recommendedAgent;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <Phone className="h-4 w-4" />
          Schedule AI Call
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Schedule AI Voice Call
          </DialogTitle>
          <DialogDescription>
            Schedule an automated AI voice agent call to follow up with this lead
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* AI Recommendations */}
          {aiAssisted && recommendations && (
            <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  AI Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recommendedAgent && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Recommended Agent</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="gap-1">
                        <User className="h-3 w-3" />
                        {agents.find(a => a._id === recommendedAgent)?.name || 'AI Agent'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Best match based on lead profile
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Best Times to Call</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedTimes.map((slot, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => setCallTime(slot.time)}
                        className={cn(
                          "gap-2",
                          callTime === slot.time && "bg-purple-100 dark:bg-purple-900 border-purple-300"
                        )}
                      >
                        <Clock className="h-3 w-3" />
                        {slot.time}
                        <span className="text-xs text-muted-foreground">- {slot.reason}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lead Information */}
          <div className="bg-muted rounded-lg p-4">
            <h4 className="font-semibold mb-2">Lead Details</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span> {lead?.name}
              </div>
              <div>
                <span className="text-muted-foreground">Phone:</span> {lead?.phone}
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>{' '}
                <Badge variant="outline" className="capitalize">{lead?.status}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Priority:</span>{' '}
                <Badge variant="outline" className="capitalize">{lead?.priority}</Badge>
              </div>
            </div>
          </div>

          {/* Select Agent */}
          <div className="space-y-2">
            <Label htmlFor="agent">Select AI Agent *</Label>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger id="agent">
                <SelectValue placeholder="Choose an AI voice agent" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent._id} value={agent._id}>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{agent.name}</span>
                      {agent._id === recommendedAgent && (
                        <Badge variant="secondary" className="ml-2">Recommended</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedAgent && (
              <p className="text-xs text-muted-foreground">
                {agents.find(a => a._id === selectedAgent)?.description || 'AI voice agent'}
              </p>
            )}
          </div>

          {/* Call Type */}
          <div className="space-y-2">
            <Label htmlFor="callType">Call Type *</Label>
            <Select value={callType} onValueChange={setCallType}>
              <SelectTrigger id="callType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call">General Call</SelectItem>
                <SelectItem value="follow_up">Follow-up</SelectItem>
                <SelectItem value="consultation">Consultation</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="site_visit">Site Visit Discussion</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Call Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !callDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {callDate ? format(callDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={callDate}
                  onSelect={setCallDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <Label htmlFor="time">Call Time *</Label>
            <Input
              id="time"
              type="time"
              value={callTime}
              onChange={(e) => setCallTime(e.target.value)}
            />
          </div>

          {/* Call Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions">Call Instructions</Label>
            <Textarea
              id="instructions"
              placeholder="Special instructions for the AI agent (e.g., topics to discuss, questions to ask, goals for the call)"
              value={callInstructions}
              onChange={(e) => setCallInstructions(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              The AI agent will use these instructions to guide the conversation
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => setAiAssisted(!aiAssisted)}
              className="gap-2"
            >
              <Sparkles className={cn(
                "h-4 w-4",
                aiAssisted ? "text-purple-600" : "text-muted-foreground"
              )} />
              {aiAssisted ? 'AI Assist On' : 'AI Assist Off'}
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSchedule}
                disabled={!selectedAgent || !callDate || !callTime || scheduleCallMutation.isPending}
              >
                {scheduleCallMutation.isPending ? 'Scheduling...' : 'Schedule Call'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
