export interface User {
  _id: string;
  email: string;
  name?: string;
  phone?: string;
  businessName?: string;
  businessType?: string;
}

export interface Lead {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  source: 'call' | 'sms' | 'web';
  status: 'new' | 'contacted' | 'qualified' | 'won' | 'lost';
  value?: number;
  notes?: string;
  projectType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Call {
  _id: string;
  phone: string;
  contactName?: string;
  type: 'missed' | 'ai_handled' | 'manual';
  duration?: number;
  transcript?: string;
  aiConfidence?: number;
  leadCreated?: boolean;
  leadId?: string;
  timestamp: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface Message {
  _id: string;
  phone: string;
  contactName?: string;
  type: 'incoming' | 'outgoing';
  content: string;
  aiGenerated: boolean;
  leadCreated?: boolean;
  leadId?: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
}

export interface MessageThread {
  phone: string;
  contactName?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
}

export interface AppSettings {
  voiceAgentEnabled: boolean;
  smsAgentEnabled: boolean;
  aiPersonality: 'professional' | 'friendly' | 'casual';
  businessName: string;
  businessType: string;
  businessHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  autoReplyEnabled: boolean;
  qualificationQuestions: string[];
  notificationsEnabled: boolean;
}
