import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Building2,
  DollarSign,
  Calendar,
  FileText,
  MessageSquare,
  Activity,
  CreditCard,
  Users,
  Bot,
  Upload,
  Save,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AICallScheduler from '@/components/AICallScheduler';
import ConversationHistoryViewer from '@/components/ConversationHistoryViewer';

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  contacted: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  qualified: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  proposal_sent: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  negotiation: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  converted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  lost: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  on_hold: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
};

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedLead, setEditedLead] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch lead data
  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      const res = await api.get(`/leads/${id}`);
      return res.data;
    }
  });

  // Fetch notes
  const { data: notes = [] } = useQuery({
    queryKey: ['notes', id],
    queryFn: async () => {
      const res = await api.get(`/notes/lead/${id}`);
      return res.data;
    },
    enabled: !!id
  });

  // Fetch transactions
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', id],
    queryFn: async () => {
      const res = await api.get(`/transactions/lead/${id}`);
      return res.data;
    },
    enabled: !!id
  });

  // Fetch estimates
  const { data: estimates = [] } = useQuery({
    queryKey: ['estimates', id],
    queryFn: async () => {
      const res = await api.get(`/estimates/lead/${id}`);
      return res.data;
    },
    enabled: !!id
  });

  // Fetch appointments
  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', id],
    queryFn: async () => {
      const res = await api.get(`/appointments/lead/${id}`);
      return res.data;
    },
    enabled: !!id
  });

  // Fetch AI conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ['ai-conversations', id],
    queryFn: async () => {
      const res = await api.get(`/ai-conversations/lead/${id}`);
      return res.data;
    },
    enabled: !!id
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      const res = await api.get(`/projects?leadId=${id}`);
      return res.data;
    },
    enabled: !!id
  });

  // Update lead mutation
  const updateLeadMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.patch(`/leads/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['lead', id]);
      queryClient.invalidateQueries(['leads']);
      setIsEditing(false);
    }
  });

  // Delete lead mutation
  const deleteLeadMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/leads/${id}`);
    },
    onSuccess: () => {
      navigate('/app/crm');
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Lead not found</p>
        <Button onClick={() => navigate('/app/crm')} className="mt-4">
          Back to CRM
        </Button>
      </div>
    );
  }

  const handleSave = () => {
    updateLeadMutation.mutate(editedLead);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this lead?')) {
      deleteLeadMutation.mutate();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app/crm')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to CRM
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{lead.name}</h1>
            {lead.company && (
              <p className="text-gray-500 flex items-center gap-2 mt-1">
                <Building2 className="h-4 w-4" />
                {lead.company}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <AICallScheduler
                leadId={id}
                lead={lead}
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ['lead', id] });
                  queryClient.invalidateQueries({ queryKey: ['appointments'] });
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditedLead(lead);
                  setIsEditing(true);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateLeadMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status and Priority Badges */}
      <div className="flex items-center gap-2">
        <Badge className={STATUS_COLORS[lead.status] || STATUS_COLORS.new}>
          {lead.status?.replace('_', ' ').toUpperCase()}
        </Badge>
        <Badge className={PRIORITY_COLORS[lead.priority] || PRIORITY_COLORS.medium}>
          {lead.priority?.toUpperCase()} PRIORITY
        </Badge>
        {lead.qualified && (
          <Badge className="bg-green-100 text-green-800">
            QUALIFIED
          </Badge>
        )}
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold">${lead.totalRevenue || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Notes</p>
                <p className="text-2xl font-bold">{lead.counts?.notes || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Appointments</p>
                <p className="text-2xl font-bold">{lead.counts?.appointments || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Bot className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-500">AI Conversations</p>
                <p className="text-2xl font-bold">{lead.counts?.conversations || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
          <TabsTrigger value="projects">Projects ({projects.length})</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="estimates">Estimates</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="conversations">AI Conversations</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={editedLead.name}
                        onChange={(e) => setEditedLead({ ...editedLead, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={editedLead.email}
                        onChange={(e) => setEditedLead({ ...editedLead, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={editedLead.phone}
                        onChange={(e) => setEditedLead({ ...editedLead, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Company</Label>
                      <Input
                        value={editedLead.company || ''}
                        onChange={(e) => setEditedLead({ ...editedLead, company: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Job Title</Label>
                      <Input
                        value={editedLead.jobTitle || ''}
                        onChange={(e) => setEditedLead({ ...editedLead, jobTitle: e.target.value })}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${lead.email}`} className="hover:underline">{lead.email}</a>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${lead.phone}`} className="hover:underline">{lead.phone}</a>
                    </div>
                    {lead.alternatePhone && (
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <Phone className="h-4 w-4" />
                        <span className="text-sm text-gray-500">Alt: </span>
                        <a href={`tel:${lead.alternatePhone}`} className="hover:underline">{lead.alternatePhone}</a>
                      </div>
                    )}
                    {lead.company && (
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <Building2 className="h-4 w-4" />
                        {lead.company}
                        {lead.jobTitle && <span className="text-sm text-gray-500">- {lead.jobTitle}</span>}
                      </div>
                    )}
                    {lead.address && (
                      <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                        <MapPin className="h-4 w-4 mt-1" />
                        <div>
                          {lead.address.street && <div>{lead.address.street}</div>}
                          {lead.address.city && (
                            <div>
                              {lead.address.city}{lead.address.state && `, ${lead.address.state}`} {lead.address.zipCode}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Lead Details */}
            <Card>
              <CardHeader>
                <CardTitle>Lead Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={editedLead.status}
                        onValueChange={(value) => setEditedLead({ ...editedLead, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="qualified">Qualified</SelectItem>
                          <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                          <SelectItem value="negotiation">Negotiation</SelectItem>
                          <SelectItem value="converted">Converted</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <Select
                        value={editedLead.priority}
                        onValueChange={(value) => setEditedLead({ ...editedLead, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Estimated Value</Label>
                      <Input
                        type="number"
                        value={editedLead.estimatedValue || ''}
                        onChange={(e) => setEditedLead({ ...editedLead, estimatedValue: parseFloat(e.target.value) })}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-sm text-gray-500">Source:</span>
                      <p className="font-medium capitalize">{lead.source?.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Estimated Value:</span>
                      <p className="font-medium">${lead.estimatedValue || 0}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Qualification Score:</span>
                      <p className="font-medium">{lead.qualificationScore || 0}/100</p>
                    </div>
                    {lead.tags && lead.tags.length > 0 && (
                      <div>
                        <span className="text-sm text-gray-500">Tags:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {lead.tags.map((tag, idx) => (
                            <Badge key={idx} variant="secondary">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {lead.lastActivityAt && (
                      <div>
                        <span className="text-sm text-gray-500">Last Activity:</span>
                        <p className="font-medium">{new Date(lead.lastActivityAt).toLocaleString()}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Project Details */}
          {(lead.projectType || lead.projectDescription) && (
            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {lead.projectType && (
                  <div>
                    <span className="text-sm text-gray-500">Project Type:</span>
                    <p className="font-medium">{lead.projectType}</p>
                  </div>
                )}
                {lead.serviceCategory && (
                  <div>
                    <span className="text-sm text-gray-500">Service Category:</span>
                    <p className="font-medium">{lead.serviceCategory}</p>
                  </div>
                )}
                {lead.projectDescription && (
                  <div>
                    <span className="text-sm text-gray-500">Description:</span>
                    <p className="mt-1">{lead.projectDescription}</p>
                  </div>
                )}
                {lead.budget && (
                  <div>
                    <span className="text-sm text-gray-500">Budget Range:</span>
                    <p className="font-medium">${lead.budget.min} - ${lead.budget.max}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Notes</CardTitle>
                <Button size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {notes.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No notes yet</p>
              ) : (
                <div className="space-y-4">
                  {notes.map((note) => (
                    <div key={note._id} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{note.createdByName}</span>
                        <span className="text-sm text-gray-500">
                          {new Date(note.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300">{note.content}</p>
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {note.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Projects</CardTitle>
                <Button size="sm">
                  <Activity className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No projects yet</p>
              ) : (
                <div className="space-y-4">
                  {projects.map((project) => (
                    <div key={project._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{project.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">{project.projectNumber}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={
                            project.status === 'completed' ? 'bg-green-100 text-green-800' :
                            project.status === 'active' ? 'bg-blue-100 text-blue-800' :
                            project.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {project.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <Badge variant="outline">
                            {project.priority?.toUpperCase()}
                          </Badge>
                        </div>
                      </div>

                      {project.description && (
                        <p className="text-sm text-gray-600 mb-3">{project.description}</p>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {project.startDate && (
                          <div>
                            <span className="text-gray-500">Start Date:</span>
                            <p className="font-medium">{new Date(project.startDate).toLocaleDateString()}</p>
                          </div>
                        )}
                        {project.endDate && (
                          <div>
                            <span className="text-gray-500">End Date:</span>
                            <p className="font-medium">{new Date(project.endDate).toLocaleDateString()}</p>
                          </div>
                        )}
                        {project.budget && project.budget.estimated && (
                          <div>
                            <span className="text-gray-500">Budget:</span>
                            <p className="font-medium">${project.budget.estimated.toLocaleString()}</p>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500">Progress:</span>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${project.progress || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium">{project.progress || 0}%</span>
                          </div>
                        </div>
                      </div>

                      {project.tasks && project.tasks.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center gap-4 text-xs text-gray-600">
                            <span>{project.tasks.length} tasks</span>
                            <span>{project.tasks.filter(t => t.status === 'completed').length} completed</span>
                            {project.teamMembers && project.teamMembers.length > 0 && (
                              <span>{project.teamMembers.length + 1} team members</span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Edit className="h-3 w-3 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No transactions yet</p>
              ) : (
                <div className="space-y-2">
                  {transactions.map((txn) => (
                    <div key={txn._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{txn.description}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(txn.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${txn.amount}</p>
                        <Badge variant={txn.status === 'completed' ? 'success' : 'secondary'}>
                          {txn.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other tabs placeholders */}
        <TabsContent value="estimates">
          <Card>
            <CardHeader>
              <CardTitle>Estimates</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-500 py-8">
                Estimates feature coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appointments">
          <Card>
            <CardHeader>
              <CardTitle>Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-500 py-8">
                Appointments feature coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversations">
          <Card>
            <CardHeader>
              <CardTitle>AI Conversations</CardTitle>
            </CardHeader>
            <CardContent>
              <ConversationHistoryViewer leadId={id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle>Files & Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-500 py-8">
                File storage feature coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
