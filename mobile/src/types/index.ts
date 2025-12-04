export interface Task {
  _id: string;
  title: string;
  dueDate?: string;
  isCompleted: boolean;
}

export interface Deal {
  _id: string;
  title: string;
  value: number;
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  probability: number;
  priority: 'low' | 'medium' | 'high';
  contact?: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    company?: string;
  };
  description?: string;
  expectedCloseDate?: string;
  dueDate?: string; // Date for calendar integration - when action is needed
  createdAt: string;
  updatedAt: string;
  tasks?: Task[];
}

// Calendar event types for CRM integration
export interface CRMCalendarEvent {
  id: string;
  title: string;
  type: 'deal' | 'task' | 'lead_followup';
  startDate: Date;
  endDate: Date;
  dealId?: string;
  value?: number;
  stage?: string;
  priority?: 'low' | 'medium' | 'high';
  contactName?: string;
}

export interface Lead {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  source?: string;
  status: string;
  notes?: string;
  createdAt: string;
}

export interface PipelineSummary {
  stages: Record<string, { count: number; totalValue: number; weightedValue: number }>;
  overall: { totalDeals: number; totalValue: number; weightedValue: number };
}

export const STAGES = [
  { key: 'lead', label: 'Lead', color: '#6366f1' },
  { key: 'qualified', label: 'Qualified', color: '#3b82f6' },
  { key: 'proposal', label: 'Proposal', color: '#a855f7' },
  { key: 'negotiation', label: 'Negotiation', color: '#d946ef' },
  { key: 'won', label: 'Won', color: '#22c55e' },
  { key: 'lost', label: 'Lost', color: '#ef4444' },
];

export const PRIORITIES = [
  { key: 'low', label: 'Low', color: '#6b7280' },
  { key: 'medium', label: 'Medium', color: '#f59e0b' },
  { key: 'high', label: 'High', color: '#ef4444' },
];

// ========================================
// Invoice/Estimate Types
// ========================================

export interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  taxable?: boolean;
}

export interface InvoiceClient {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
}

export type InvoiceType = 'invoice' | 'estimate';
export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired' | 'partial' | 'paid' | 'overdue' | 'cancelled';
export type PaymentMethod = 'cash' | 'check' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'paypal' | 'stripe' | 'venmo' | 'zelle' | 'other';
export type PaymentType = 'deposit' | 'partial' | 'final' | 'refund';
export type SyncStatus = 'pending' | 'synced' | 'failed' | 'not_connected';

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  type: InvoiceType;
  status: InvoiceStatus;
  client: InvoiceClient;
  lead?: string;
  project?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  issueDate: string;
  dueDate?: string;
  validUntil?: string;
  sentDate?: string;
  viewedDate?: string;
  paidDate?: string;
  notes?: string;
  terms?: string;
  paymentInstructions?: string;
  // QuickBooks integration
  quickbooksId?: string;
  quickbooksCustomerId?: string;
  syncStatus?: SyncStatus;
  lastSyncedAt?: string;
  syncError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  _id: string;
  invoice: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  referenceNumber?: string;
  checkNumber?: string;
  transactionId?: string;
  notes?: string;
  memo?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'voided';
  // QuickBooks integration
  quickbooksId?: string;
  syncStatus?: SyncStatus;
  lastSyncedAt?: string;
  createdAt: string;
}

export interface InvoiceStats {
  totalRevenue: number;
  paidInvoices: number;
  pendingInvoices: number;
  draftInvoices: number;
  overdueInvoices: number;
  activeEstimates: number;
  outstandingBalance: number;
}

// Invoice status colors and labels
export const INVOICE_STATUSES = [
  { key: 'draft', label: 'Draft', color: '#6b7280' },
  { key: 'sent', label: 'Sent', color: '#3b82f6' },
  { key: 'viewed', label: 'Viewed', color: '#3b82f6' },
  { key: 'partial', label: 'Partial', color: '#f59e0b' },
  { key: 'paid', label: 'Paid', color: '#22c55e' },
  { key: 'overdue', label: 'Overdue', color: '#ef4444' },
  { key: 'cancelled', label: 'Cancelled', color: '#6b7280' },
];

export const ESTIMATE_STATUSES = [
  { key: 'draft', label: 'Draft', color: '#6b7280' },
  { key: 'sent', label: 'Sent', color: '#3b82f6' },
  { key: 'viewed', label: 'Viewed', color: '#3b82f6' },
  { key: 'accepted', label: 'Accepted', color: '#22c55e' },
  { key: 'declined', label: 'Declined', color: '#ef4444' },
  { key: 'expired', label: 'Expired', color: '#6b7280' },
];

export const PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash', icon: 'cash-outline' },
  { key: 'check', label: 'Check', icon: 'document-text-outline' },
  { key: 'credit_card', label: 'Credit Card', icon: 'card-outline' },
  { key: 'debit_card', label: 'Debit Card', icon: 'card-outline' },
  { key: 'bank_transfer', label: 'Bank Transfer', icon: 'business-outline' },
  { key: 'paypal', label: 'PayPal', icon: 'logo-paypal' },
  { key: 'venmo', label: 'Venmo', icon: 'phone-portrait-outline' },
  { key: 'zelle', label: 'Zelle', icon: 'flash-outline' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];