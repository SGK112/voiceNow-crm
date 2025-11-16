import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
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
import {
  MessageSquare,
  Phone,
  Mail,
  MessageCircle,
  Clock,
  User,
  Bot,
  TrendingUp,
  TrendingDown,
  Minus,
  Play,
  Download,
  Filter,
  Search,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const SENTIMENT_CONFIG = {
  positive: {
    color: 'text-green-600 bg-green-100 dark:bg-green-950',
    icon: TrendingUp,
    label: 'Positive'
  },
  neutral: {
    color: 'text-gray-600 bg-gray-100 dark:bg-gray-950',
    icon: Minus,
    label: 'Neutral'
  },
  negative: {
    color: 'text-red-600 bg-red-100 dark:bg-red-950',
    icon: TrendingDown,
    label: 'Negative'
  },
  mixed: {
    color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-950',
    icon: Minus,
    label: 'Mixed'
  }
};

const TYPE_ICONS = {
  voice: Phone,
  chat: MessageCircle,
  sms: MessageSquare,
  email: Mail
};

export default function ConversationHistoryViewer({ leadId }) {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterSentiment, setFilterSentiment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch conversations
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['ai-conversations', leadId],
    queryFn: async () => {
      const res = await api.get(leadId ? `/ai-conversations/lead/${leadId}` : '/ai-conversations');
      return res.data;
    }
  });

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    const matchesType = filterType === 'all' || conv.type === filterType;
    const matchesSentiment = filterSentiment === 'all' || conv.sentiment === filterSentiment;
    const matchesSearch = !searchQuery ||
      conv.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.transcript?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesType && matchesSentiment && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="voice">Voice</SelectItem>
            <SelectItem value="chat">Chat</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="email">Email</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterSentiment} onValueChange={setFilterSentiment}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sentiment</SelectItem>
            <SelectItem value="positive">Positive</SelectItem>
            <SelectItem value="neutral">Neutral</SelectItem>
            <SelectItem value="negative">Negative</SelectItem>
            <SelectItem value="mixed">Mixed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Conversations List */}
      {filteredConversations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground opacity-50 mb-3" />
            <p className="text-muted-foreground">No conversations found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredConversations.map((conversation) => {
            const TypeIcon = TYPE_ICONS[conversation.type] || MessageSquare;
            const sentimentConfig = SENTIMENT_CONFIG[conversation.sentiment] || SENTIMENT_CONFIG.neutral;
            const SentimentIcon = sentimentConfig.icon;

            return (
              <Card
                key={conversation._id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedConversation(conversation)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Type Icon */}
                    <div className="flex-shrink-0 mt-1">
                      <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
                        <TypeIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold capitalize">
                              {conversation.type} Conversation
                            </h4>
                            <Badge variant="outline" className="capitalize">
                              {conversation.status}
                            </Badge>
                          </div>
                          {conversation.agentId && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Bot className="h-3 w-3" />
                              {conversation.agentId.name || 'AI Agent'}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Sentiment Badge */}
                          <Badge variant="outline" className={cn("gap-1", sentimentConfig.color)}>
                            <SentimentIcon className="h-3 w-3" />
                            {sentimentConfig.label}
                          </Badge>
                        </div>
                      </div>

                      {/* Summary */}
                      {conversation.summary && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {conversation.summary}
                        </p>
                      )}

                      {/* Key Points */}
                      {conversation.keyPoints && conversation.keyPoints.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {conversation.keyPoints.slice(0, 3).map((point, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {point}
                            </Badge>
                          ))}
                          {conversation.keyPoints.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{conversation.keyPoints.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 pt-2 border-t">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(conversation.createdAt), 'MMM d, yyyy h:mm a')}
                        </span>
                        {conversation.duration && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {Math.floor(conversation.duration / 60)}m {conversation.duration % 60}s
                          </span>
                        )}
                        {conversation.actionItems && conversation.actionItems.length > 0 && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {conversation.actionItems.filter(a => a.completed).length}/{conversation.actionItems.length} actions
                          </span>
                        )}
                        {conversation.recordingUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 hover:bg-transparent"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(conversation.recordingUrl, '_blank');
                            }}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Play
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Conversation Detail Dialog */}
      <Dialog open={!!selectedConversation} onOpenChange={() => setSelectedConversation(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedConversation && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 capitalize">
                  {React.createElement(TYPE_ICONS[selectedConversation.type] || MessageSquare, {
                    className: "h-5 w-5"
                  })}
                  {selectedConversation.type} Conversation
                </DialogTitle>
                <DialogDescription>
                  {format(new Date(selectedConversation.createdAt), 'MMMM d, yyyy at h:mm a')}
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="transcript" className="mt-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="transcript">Transcript</TabsTrigger>
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="actions">Action Items</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                </TabsList>

                {/* Transcript Tab */}
                <TabsContent value="transcript" className="space-y-4">
                  {selectedConversation.messages && selectedConversation.messages.length > 0 ? (
                    <div className="space-y-3">
                      {selectedConversation.messages.map((message, index) => (
                        <div
                          key={index}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg",
                            message.role === 'user' ? 'bg-blue-50 dark:bg-blue-950' : 'bg-gray-50 dark:bg-gray-950'
                          )}
                        >
                          <div className="flex-shrink-0 mt-1">
                            {message.role === 'user' ? (
                              <User className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Bot className="h-5 w-5 text-purple-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium mb-1 capitalize">{message.role}</p>
                            <p className="text-sm">{message.content}</p>
                            {message.timestamp && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(message.timestamp), 'h:mm:ss a')}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : selectedConversation.transcript ? (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{selectedConversation.transcript}</p>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No transcript available</p>
                  )}

                  {selectedConversation.recordingUrl && (
                    <div className="flex items-center justify-center gap-2 pt-4 border-t">
                      <Button variant="outline" onClick={() => window.open(selectedConversation.recordingUrl, '_blank')}>
                        <Play className="h-4 w-4 mr-2" />
                        Play Recording
                      </Button>
                      <Button variant="outline" onClick={() => window.open(selectedConversation.recordingUrl, '_blank')}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Summary Tab */}
                <TabsContent value="summary" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Conversation Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{selectedConversation.summary || 'No summary available'}</p>
                    </CardContent>
                  </Card>

                  {selectedConversation.keyPoints && selectedConversation.keyPoints.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Key Points</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {selectedConversation.keyPoints.map((point, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Sentiment Analysis */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Sentiment Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        {React.createElement(SENTIMENT_CONFIG[selectedConversation.sentiment].icon, {
                          className: `h-8 w-8 ${SENTIMENT_CONFIG[selectedConversation.sentiment].color.split(' ')[0]}`
                        })}
                        <div>
                          <p className="font-semibold">{SENTIMENT_CONFIG[selectedConversation.sentiment].label}</p>
                          {selectedConversation.sentimentScore && (
                            <p className="text-sm text-muted-foreground">
                              Score: {(selectedConversation.sentimentScore * 100).toFixed(0)}%
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Action Items Tab */}
                <TabsContent value="actions" className="space-y-3">
                  {selectedConversation.actionItems && selectedConversation.actionItems.length > 0 ? (
                    selectedConversation.actionItems.map((action, index) => (
                      <Card key={index}>
                        <CardContent className="p-4 flex items-start gap-3">
                          {action.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className={cn("text-sm", action.completed && "line-through text-muted-foreground")}>
                              {action.description}
                            </p>
                            {action.dueDate && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Due: {format(new Date(action.dueDate), 'MMM d, yyyy')}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No action items</p>
                  )}
                </TabsContent>

                {/* Details Tab */}
                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Type</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="capitalize">{selectedConversation.type}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge className="capitalize">{selectedConversation.status}</Badge>
                      </CardContent>
                    </Card>

                    {selectedConversation.duration && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Duration</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p>{Math.floor(selectedConversation.duration / 60)}m {selectedConversation.duration % 60}s</p>
                        </CardContent>
                      </Card>
                    )}

                    {selectedConversation.agentId && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Agent</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p>{selectedConversation.agentId.name || 'AI Agent'}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
