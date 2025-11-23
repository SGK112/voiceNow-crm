import { useState, useEffect } from 'react';
import { MessageSquare, Send, Users, Plus, Search, Hash, X, Settings, Slack, Mail, Phone as PhoneIcon, Building2, Wrench, DollarSign, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/utils/toast';

const CHANNEL_TYPES = [
  { id: 'team', name: 'Team', icon: Users, color: 'blue', description: 'Internal team communications' },
  { id: 'customers', name: 'Customers', icon: Building2, color: 'green', description: 'Customer conversations' },
  { id: 'contractors', name: 'Contractors', icon: Wrench, color: 'orange', description: 'Contractor coordination' },
  { id: 'vendors', name: 'Vendors', icon: DollarSign, color: 'purple', description: 'Vendor communications' },
  { id: 'general', name: 'General', icon: Hash, color: 'gray', description: 'General discussions' }
];

// Mock data - in production this would come from API
const INITIAL_CHANNELS = [
  {
    id: '1',
    name: 'general-team',
    type: 'team',
    description: 'General team updates and discussions',
    members: 12,
    unread: 3,
    slackIntegrated: true,
    slackChannelId: 'C123456'
  },
  {
    id: '2',
    name: 'customer-support',
    type: 'customers',
    description: 'Customer support inquiries',
    members: 8,
    unread: 5,
    slackIntegrated: false
  },
  {
    id: '3',
    name: 'contractor-scheduling',
    type: 'contractors',
    description: 'Scheduling and coordination with contractors',
    members: 15,
    unread: 0,
    slackIntegrated: true,
    slackChannelId: 'C789012'
  },
  {
    id: '4',
    name: 'vendor-orders',
    type: 'vendors',
    description: 'Purchase orders and vendor communications',
    members: 6,
    unread: 2,
    slackIntegrated: false
  }
];

const INITIAL_MESSAGES = {
  '1': [
    { id: '1', sender: 'John Doe', message: 'Team meeting at 3pm today', timestamp: new Date(Date.now() - 3600000), isMe: false },
    { id: '2', sender: 'Me', message: 'Got it, I\'ll be there', timestamp: new Date(Date.now() - 3000000), isMe: true },
    { id: '3', sender: 'Sarah Smith', message: 'Can someone review the latest proposal?', timestamp: new Date(Date.now() - 1800000), isMe: false },
  ],
  '2': [
    { id: '4', sender: 'Customer: ABC Corp', message: 'When can we schedule the next site visit?', timestamp: new Date(Date.now() - 7200000), isMe: false },
    { id: '5', sender: 'Me', message: 'How about Thursday at 10am?', timestamp: new Date(Date.now() - 5400000), isMe: true },
  ],
  '3': [
    { id: '6', sender: 'Mike Johnson (Contractor)', message: 'Materials will arrive on Monday', timestamp: new Date(Date.now() - 10800000), isMe: false },
    { id: '7', sender: 'Me', message: 'Perfect, thanks for the update', timestamp: new Date(Date.now() - 9000000), isMe: true },
  ],
  '4': [
    { id: '8', sender: 'XYZ Supplies', message: 'Your order #1234 has shipped', timestamp: new Date(Date.now() - 14400000), isMe: false },
    { id: '9', sender: 'Me', message: 'Great! What\'s the tracking number?', timestamp: new Date(Date.now() - 12600000), isMe: true },
  ]
};

export default function Messages() {
  const [channels, setChannels] = useState(INITIAL_CHANNELS);
  const [selectedChannel, setSelectedChannel] = useState(INITIAL_CHANNELS[0]);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [showSlackSettings, setShowSlackSettings] = useState(false);
  const [filterType, setFilterType] = useState('all');

  const [newChannelData, setNewChannelData] = useState({
    name: '',
    type: 'team',
    description: '',
    slackIntegrated: false,
    slackChannelId: ''
  });

  const [slackSettings, setSlackSettings] = useState({
    connected: false,
    workspace: '',
    webhookUrl: ''
  });

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now().toString(),
      sender: 'Me',
      message: newMessage,
      timestamp: new Date(),
      isMe: true
    };

    setMessages(prev => ({
      ...prev,
      [selectedChannel.id]: [...(prev[selectedChannel.id] || []), message]
    }));

    setNewMessage('');
    toast.success('Message sent');

    // If channel is Slack-integrated, send to Slack too
    if (selectedChannel.slackIntegrated && slackSettings.webhookUrl) {
      sendToSlack(newMessage);
    }
  };

  const sendToSlack = async (message) => {
    try {
      // In production, this would send to your backend which posts to Slack
      console.log('Sending to Slack:', message);
      // await fetch(slackSettings.webhookUrl, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ text: message })
      // });
    } catch (error) {
      console.error('Failed to send to Slack:', error);
    }
  };

  const handleCreateChannel = () => {
    if (!newChannelData.name.trim()) {
      toast.error('Channel name is required');
      return;
    }

    const channel = {
      id: Date.now().toString(),
      name: newChannelData.name,
      type: newChannelData.type,
      description: newChannelData.description,
      members: 1,
      unread: 0,
      slackIntegrated: newChannelData.slackIntegrated,
      slackChannelId: newChannelData.slackChannelId
    };

    setChannels(prev => [...prev, channel]);
    setMessages(prev => ({ ...prev, [channel.id]: [] }));
    setShowNewChannel(false);
    setNewChannelData({
      name: '',
      type: 'team',
      description: '',
      slackIntegrated: false,
      slackChannelId: ''
    });
    toast.success('Channel created successfully');
  };

  const handleConnectSlack = () => {
    // In production, this would redirect to Slack OAuth
    toast.success('Connecting to Slack... (Demo mode)');
    setSlackSettings(prev => ({ ...prev, connected: true, workspace: 'My Workspace' }));
    setShowSlackSettings(false);
  };

  const filteredChannels = channels.filter(channel => {
    const matchesSearch = channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         channel.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || channel.type === filterType;
    return matchesSearch && matchesType;
  });

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getChannelIcon = (type) => {
    const channelType = CHANNEL_TYPES.find(t => t.id === type);
    return channelType ? channelType.icon : Hash;
  };

  const getChannelColor = (type) => {
    const channelType = CHANNEL_TYPES.find(t => t.id === type);
    return channelType ? channelType.color : 'gray';
  };

  const totalUnread = channels.reduce((sum, channel) => sum + channel.unread, 0);

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4">
      {/* Sidebar - Channels List */}
      <div className="w-80 flex flex-col bg-[#0f0f10] rounded-xl shadow-2xl border border-white/5">
        {/* Header */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                Channels
              </h2>
              {totalUnread > 0 && (
                <div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20">
                  <span className="text-xs font-medium text-blue-400">{totalUnread} New</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSlackSettings(true)}
                className="hover:bg-white/5 text-gray-400 hover:text-white"
              >
                <Slack className={`w-4 h-4 ${slackSettings.connected ? 'text-purple-400' : ''}`} />
              </Button>
              <Button
                onClick={() => setShowNewChannel(true)}
                size="icon"
                className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input
              placeholder="Search channels..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500/50 focus:ring-blue-500/20"
            />
          </div>

          {/* Type Filter */}
          <div className="mt-3">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-blue-500/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1b] border-white/10">
                <SelectItem value="all" className="text-white hover:bg-white/5">All Channels</SelectItem>
                {CHANNEL_TYPES.map(type => (
                  <SelectItem key={type.id} value={type.id} className="text-white hover:bg-white/5">
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredChannels.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No channels found</p>
            </div>
          ) : (
            filteredChannels.map(channel => {
              const ChannelIcon = getChannelIcon(channel.type);
              const isSelected = selectedChannel?.id === channel.id;

              return (
                <button
                  key={channel.id}
                  onClick={() => setSelectedChannel(channel)}
                  className={`w-full text-left p-3 rounded-lg mb-1 transition-all ${
                    isSelected
                      ? 'bg-blue-600/10 border border-blue-500/30 shadow-lg shadow-blue-500/5'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <ChannelIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isSelected ? 'text-blue-400' : 'text-gray-500'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium text-sm truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                            {channel.name}
                          </p>
                          {channel.slackIntegrated && (
                            <Slack className="w-3 h-3 text-purple-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {channel.members} members
                        </p>
                      </div>
                    </div>
                    {channel.unread > 0 && (
                      <div className="ml-2 px-1.5 py-0.5 bg-blue-500 rounded text-white text-xs font-medium flex-shrink-0">
                        {channel.unread}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#0f0f10] rounded-xl shadow-2xl border border-white/5">
        {selectedChannel ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(() => {
                    const ChannelIcon = getChannelIcon(selectedChannel.type);
                    return <ChannelIcon className="w-5 h-5 text-blue-400" />;
                  })()}
                  <div>
                    <h3 className="font-semibold text-white">
                      {selectedChannel.name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {selectedChannel.description || `${selectedChannel.members} members`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedChannel.slackIntegrated && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/20">
                      <Slack className="w-3 h-3 text-purple-400" />
                      <span className="text-xs font-medium text-purple-400">Synced</span>
                    </div>
                  )}
                  <div className="inline-flex items-center px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20">
                    <span className="text-xs font-medium text-blue-400">
                      {CHANNEL_TYPES.find(t => t.id === selectedChannel.type)?.name}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {(messages[selectedChannel.id] || []).map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-md ${msg.isMe ? 'text-right' : 'text-left'}`}>
                    {!msg.isMe && (
                      <p className="text-xs font-medium text-gray-400 mb-1">
                        {msg.sender}
                      </p>
                    )}
                    <div
                      className={`inline-block rounded-xl px-4 py-2.5 ${
                        msg.isMe
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/5 border border-white/10 text-gray-200'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{msg.message}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))}

              {(messages[selectedChannel.id] || []).length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm text-gray-300">No messages yet</p>
                  <p className="text-xs mt-1">Send a message to start the conversation</p>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-white/5">
              <div className="flex gap-2">
                <Textarea
                  placeholder={`Message ${selectedChannel.name}...`}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 resize-none bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500/50 focus:ring-blue-500/20"
                  rows={3}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white self-end disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Enter to send • Shift+Enter for new line
                {selectedChannel.slackIntegrated && ' • Synced with Slack'}
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-gray-300">Select a channel to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* New Channel Modal */}
      <Dialog open={showNewChannel} onOpenChange={setShowNewChannel}>
        <DialogContent className="bg-white dark:bg-secondary sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-gray-900 text-foreground">Create New Channel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-900 text-foreground">Channel Name *</Label>
              <Input
                placeholder="e.g., project-updates"
                value={newChannelData.name}
                onChange={(e) => setNewChannelData({ ...newChannelData, name: e.target.value })}
                className="bg-white bg-secondary border-gray-200 border-border text-gray-900 text-foreground"
              />
            </div>

            <div>
              <Label className="text-gray-900 text-foreground">Channel Type *</Label>
              <Select
                value={newChannelData.type}
                onValueChange={(value) => setNewChannelData({ ...newChannelData, type: value })}
              >
                <SelectTrigger className="bg-white bg-secondary border-gray-200 border-border text-gray-900 text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white bg-secondary">
                  {CHANNEL_TYPES.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <type.icon className="w-4 h-4" />
                        <span>{type.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-700 text-foreground mt-1">
                {CHANNEL_TYPES.find(t => t.id === newChannelData.type)?.description}
              </p>
            </div>

            <div>
              <Label className="text-gray-900 text-foreground">Description</Label>
              <Textarea
                placeholder="What is this channel about?"
                value={newChannelData.description}
                onChange={(e) => setNewChannelData({ ...newChannelData, description: e.target.value })}
                className="bg-white bg-secondary border-gray-200 border-border text-gray-900 text-foreground"
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="slackIntegrated"
                checked={newChannelData.slackIntegrated}
                onChange={(e) => setNewChannelData({ ...newChannelData, slackIntegrated: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="slackIntegrated" className="text-gray-900 text-foreground">
                Integrate with Slack
              </Label>
            </div>

            {newChannelData.slackIntegrated && (
              <div>
                <Label className="text-gray-900 text-foreground">Slack Channel ID</Label>
                <Input
                  placeholder="C123456789"
                  value={newChannelData.slackChannelId}
                  onChange={(e) => setNewChannelData({ ...newChannelData, slackChannelId: e.target.value })}
                  className="bg-white bg-secondary border-gray-200 border-border text-gray-900 text-foreground"
                />
                <p className="text-xs text-gray-700 text-foreground mt-1">
                  Find this in Slack channel settings
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleCreateChannel}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Create Channel
              </Button>
              <Button
                onClick={() => setShowNewChannel(false)}
                variant="outline"
                className="flex-1 border-gray-200 border-border text-gray-900 text-foreground"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Slack Settings Modal */}
      <Dialog open={showSlackSettings} onOpenChange={setShowSlackSettings}>
        <DialogContent className="bg-white dark:bg-secondary sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-gray-900 text-foreground flex items-center gap-2">
              <Slack className="w-5 h-5 text-purple-600" />
              Slack Integration
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {slackSettings.connected ? (
              <>
                <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Connected to Slack
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-200 mt-1">
                    Workspace: {slackSettings.workspace}
                  </p>
                </div>
                <Button
                  onClick={() => setSlackSettings({ connected: false, workspace: '', webhookUrl: '' })}
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                >
                  Disconnect Slack
                </Button>
              </>
            ) : (
              <>
                <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Connect Slack to:
                  </p>
                  <ul className="text-xs text-blue-700 dark:text-blue-200 space-y-1">
                    <li>• Sync messages across platforms</li>
                    <li>• Keep your team in the loop</li>
                    <li>• Use Slack's mobile app for notifications</li>
                    <li>• Maintain conversation history</li>
                  </ul>
                </div>

                <div>
                  <Label className="text-gray-900 text-foreground">Slack Webhook URL (Optional)</Label>
                  <Input
                    placeholder="https://hooks.slack.com/services/..."
                    value={slackSettings.webhookUrl}
                    onChange={(e) => setSlackSettings({ ...slackSettings, webhookUrl: e.target.value })}
                    className="bg-white bg-secondary border-gray-200 border-border text-gray-900 text-foreground"
                  />
                  <p className="text-xs text-gray-700 text-foreground mt-1">
                    Create an incoming webhook in your Slack workspace
                  </p>
                </div>

                <Button
                  onClick={handleConnectSlack}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-2"
                >
                  <Slack className="w-4 h-4" />
                  Connect with Slack
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
