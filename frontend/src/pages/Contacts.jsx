import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Phone,
  Mail,
  Building2,
  Search,
  LayoutGrid,
  LayoutList,
  Trash2,
  Edit,
  MessageSquare,
  Clock,
  ChevronRight,
  X,
  Upload,
  RefreshCw,
  User,
  Filter,
  ArrowUpDown,
  PhoneCall,
  MessageCircle,
  MailIcon
} from 'lucide-react';
import { contactApi } from '../services/api';

export default function Contacts() {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState({
    totalContacts: 0,
    contactsWithEmail: 0,
    contactsWithCompany: 0,
    recentContacts: 0,
    totalCalls: 0,
    totalSMS: 0,
    totalEmails: 0
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    notes: '',
    createLead: false
  });

  useEffect(() => {
    fetchContacts();
    fetchStats();
  }, [pagination.page, sortBy, sortOrder]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const response = await contactApi.getContacts({
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery,
        sortBy,
        sortOrder
      });

      if (response.data.success) {
        setContacts(response.data.contacts || []);
        setPagination(prev => ({
          ...prev,
          ...response.data.pagination
        }));
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await contactApi.getStats();
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchContacts();
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    try {
      const response = await contactApi.createContact(newContact);
      if (response.data.success) {
        setShowAddModal(false);
        setNewContact({ name: '', phone: '', email: '', company: '', notes: '', createLead: false });
        fetchContacts();
        fetchStats();
      }
    } catch (error) {
      console.error('Error adding contact:', error);
      alert(error.response?.data?.message || 'Failed to add contact');
    }
  };

  const handleUpdateContact = async (id, data) => {
    try {
      const response = await contactApi.updateContact(id, data);
      if (response.data.success) {
        fetchContacts();
        if (selectedContact?._id === id) {
          setSelectedContact(response.data.contact);
        }
      }
    } catch (error) {
      console.error('Error updating contact:', error);
      alert('Failed to update contact');
    }
  };

  const handleDeleteContact = async (id) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      const response = await contactApi.deleteContact(id);
      if (response.data.success) {
        fetchContacts();
        fetchStats();
        if (selectedContact?._id === id) {
          setShowDetailModal(false);
          setSelectedContact(null);
        }
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('Failed to delete contact');
    }
  };

  const handleSyncFromLeads = async () => {
    setSyncing(true);
    try {
      const response = await contactApi.syncFromLeads();
      if (response.data.success) {
        alert(`Synced ${response.data.results.synced} contacts from leads`);
        fetchContacts();
        fetchStats();
      }
    } catch (error) {
      console.error('Error syncing from leads:', error);
      alert('Failed to sync from leads');
    } finally {
      setSyncing(false);
    }
  };

  const openContactDetail = async (contact) => {
    try {
      const response = await contactApi.getContactById(contact._id);
      if (response.data.success) {
        setSelectedContact(response.data.contact);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error('Error fetching contact details:', error);
      // Fall back to basic contact data
      setSelectedContact(contact);
      setShowDetailModal(true);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (name) => {
    if (!name) return 'bg-gray-400';
    const colors = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-red-500', 'bg-pink-500'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Users className="w-8 h-8 text-violet-600" />
                Contacts
              </h1>
              <p className="text-muted-foreground mt-1">
                Synced from mobile app - manage all your contacts and communication history
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center bg-transparent border border-border rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 text-sm font-medium transition-colors rounded-l-lg ${
                    viewMode === 'grid'
                      ? 'bg-violet-600 text-white'
                      : 'text-foreground hover:bg-secondary'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-2 text-sm font-medium transition-colors rounded-r-lg ${
                    viewMode === 'table'
                      ? 'bg-violet-600 text-white'
                      : 'text-foreground hover:bg-secondary'
                  }`}
                >
                  <LayoutList className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => { fetchContacts(); fetchStats(); }}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 border border-emerald-600 text-emerald-600 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors disabled:opacity-50"
                title="Refresh contacts from database (including mobile app imports)"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <button
                onClick={handleSyncFromLeads}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 border border-violet-600 text-violet-600 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                Sync from Leads
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Contact
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="w-4 h-4" />
                <span className="text-sm">Total</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.totalContacts}</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Mail className="w-4 h-4" />
                <span className="text-sm">With Email</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.contactsWithEmail}</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Building2 className="w-4 h-4" />
                <span className="text-sm">With Company</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.contactsWithCompany}</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">This Week</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.recentContacts}</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-emerald-600 mb-1">
                <PhoneCall className="w-4 h-4" />
                <span className="text-sm">Calls</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.totalCalls}</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-violet-600 mb-1">
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm">Messages</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.totalSMS}</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <MailIcon className="w-4 h-4" />
                <span className="text-sm">Emails</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.totalEmails}</p>
            </div>
          </div>

          {/* Search and Sort */}
          <div className="flex items-center gap-4 mb-6">
            <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-foreground"
              />
            </form>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
              className="px-4 py-2 bg-card border border-border rounded-lg text-foreground"
            >
              <option value="updatedAt-desc">Recently Updated</option>
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="lastInteraction-desc">Recent Activity</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No contacts found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Try a different search term' : 'Add your first contact or sync from leads'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleSyncFromLeads}
                className="flex items-center gap-2 px-4 py-2 border border-violet-600 text-violet-600 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950/20"
              >
                <RefreshCw className="w-4 h-4" />
                Sync from Leads
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
              >
                <Plus className="w-4 h-4" />
                Add Contact
              </button>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredContacts.map((contact) => (
              <div
                key={contact._id}
                onClick={() => openContactDetail(contact)}
                className="bg-card border border-border rounded-xl p-4 hover:shadow-lg hover:border-violet-300 dark:hover:border-violet-700 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-12 h-12 rounded-full ${getAvatarColor(contact.name)} flex items-center justify-center text-white font-bold`}>
                    {getInitials(contact.name)}
                  </div>
                  <div className="flex items-center gap-1">
                    {contact.totalCalls > 0 && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
                        <PhoneCall className="w-3 h-3" />
                        {contact.totalCalls}
                      </span>
                    )}
                    {contact.totalSMS > 0 && (
                      <span className="flex items-center gap-1 text-xs text-violet-600 bg-violet-50 dark:bg-violet-900/20 px-2 py-1 rounded-full">
                        <MessageCircle className="w-3 h-3" />
                        {contact.totalSMS}
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="font-semibold text-foreground mb-1 truncate">{contact.name}</h3>

                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span className="truncate">{contact.phone}</span>
                  </div>
                  {contact.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}
                  {contact.company && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      <span className="truncate">{contact.company}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    {contact.lastInteraction ? `Active ${formatDate(contact.lastInteraction)}` : 'No activity'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Contact</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Phone</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Company</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-muted-foreground">Activity</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Last Contact</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredContacts.map((contact) => (
                  <tr
                    key={contact._id}
                    onClick={() => openContactDetail(contact)}
                    className="hover:bg-secondary/30 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${getAvatarColor(contact.name)} flex items-center justify-center text-white font-bold text-sm`}>
                          {getInitials(contact.name)}
                        </div>
                        <span className="font-medium text-foreground">{contact.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground">{contact.phone}</td>
                    <td className="px-4 py-3 text-foreground">{contact.email || '-'}</td>
                    <td className="px-4 py-3 text-foreground">{contact.company || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <span className="flex items-center gap-1 text-xs text-emerald-600">
                          <PhoneCall className="w-3 h-3" />
                          {contact.totalCalls || 0}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-violet-600">
                          <MessageCircle className="w-3 h-3" />
                          {contact.totalSMS || 0}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-blue-600">
                          <MailIcon className="w-3 h-3" />
                          {contact.totalEmails || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">
                      {formatDate(contact.lastInteraction)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openContactDetail(contact)}
                          className="p-2 text-muted-foreground hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteContact(contact._id)}
                          className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="px-4 py-2 border border-border rounded-lg hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-muted-foreground">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.pages}
              className="px-4 py-2 border border-border rounded-lg hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}

        {/* Add Contact Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">Add Contact</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <form onSubmit={handleAddContact} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-foreground"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-foreground"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                  <input
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-foreground"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Company</label>
                  <input
                    type="text"
                    value={newContact.company}
                    onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-foreground"
                    placeholder="Acme Inc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
                  <textarea
                    value={newContact.notes}
                    onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-foreground resize-none"
                    placeholder="Add notes about this contact..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="createLead"
                    checked={newContact.createLead}
                    onChange={(e) => setNewContact({ ...newContact, createLead: e.target.checked })}
                    className="w-4 h-4 text-violet-600 border-border rounded focus:ring-violet-500"
                  />
                  <label htmlFor="createLead" className="text-sm text-foreground">
                    Also create as lead in pipeline
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                  >
                    Add Contact
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Contact Detail Modal */}
        {showDetailModal && selectedContact && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full ${getAvatarColor(selectedContact.name)} flex items-center justify-center text-white font-bold`}>
                    {getInitials(selectedContact.name)}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{selectedContact.name}</h2>
                    {selectedContact.company && (
                      <p className="text-sm text-muted-foreground">{selectedContact.company}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedContact(null);
                  }}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                    <Phone className="w-5 h-5 text-violet-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-foreground font-medium">{selectedContact.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                    <Mail className="w-5 h-5 text-violet-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-foreground font-medium">{selectedContact.email || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Activity Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                    <PhoneCall className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-emerald-600">{selectedContact.totalCalls || 0}</p>
                    <p className="text-xs text-muted-foreground">Calls</p>
                  </div>
                  <div className="text-center p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                    <MessageCircle className="w-6 h-6 text-violet-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-violet-600">{selectedContact.totalSMS || 0}</p>
                    <p className="text-xs text-muted-foreground">Messages</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <MailIcon className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-blue-600">{selectedContact.totalEmails || 0}</p>
                    <p className="text-xs text-muted-foreground">Emails</p>
                  </div>
                </div>

                {/* Notes */}
                {selectedContact.notes && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-foreground mb-2">Notes</h3>
                    <p className="text-muted-foreground p-3 bg-secondary/50 rounded-lg">{selectedContact.notes}</p>
                  </div>
                )}

                {/* Conversation History */}
                {selectedContact.conversationHistory && selectedContact.conversationHistory.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-3">Activity History</h3>
                    <div className="space-y-2">
                      {selectedContact.conversationHistory.slice().reverse().slice(0, 10).map((item, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            item.type === 'call' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                            item.type === 'sms' ? 'bg-violet-100 dark:bg-violet-900/30' :
                            item.type === 'email' ? 'bg-blue-100 dark:bg-blue-900/30' :
                            'bg-gray-100 dark:bg-gray-900/30'
                          }`}>
                            {item.type === 'call' && <PhoneCall className="w-4 h-4 text-emerald-600" />}
                            {item.type === 'sms' && <MessageCircle className="w-4 h-4 text-violet-600" />}
                            {item.type === 'email' && <MailIcon className="w-4 h-4 text-blue-600" />}
                            {item.type === 'note' && <Edit className="w-4 h-4 text-gray-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-foreground capitalize">
                                {item.type} - {item.direction}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(item.timestamp)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{item.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between p-4 border-t border-border">
                <button
                  onClick={() => handleDeleteContact(selectedContact._id)}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${selectedContact.phone}`}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Call
                  </a>
                  <a
                    href={`sms:${selectedContact.phone}`}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Message
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
