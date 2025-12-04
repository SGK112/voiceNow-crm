import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Deal, Lead } from '../types';
import PipelineTab from '../components/crm/PipelineTab';
import DealsTab from '../components/crm/DealsTab';
import LeadsTab from '../components/crm/LeadsTab';
import DealModal from '../components/crm/DealModal';
import LeadModal from '../components/crm/LeadModal';
import { useDeals } from '../hooks/crm/useDeals';
import { useLeads } from '../hooks/crm/useLeads';
import { usePipelineSummary } from '../hooks/crm/usePipelineSummary';
import { useQueryClient } from '@tanstack/react-query';

type TabType = 'pipeline' | 'deals' | 'leads';

export default function CRMScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  // State
  const [activeTab, setActiveTab] = useState<TabType>('pipeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [showDealModal, setShowDealModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [dealToCreate, setDealToCreate] = useState<Partial<Deal> | null>(null);

  const { data: deals, isLoading: isLoadingDeals, isRefetching: isRefetchingDeals, refetch: refetchDeals } = useDeals();
  const { data: leads, isLoading: isLoadingLeads, isRefetching: isRefetchingLeads, refetch: refetchLeads } = useLeads();
  const { data: summary, isLoading: isLoadingSummary, refetch: refetchSummary } = usePipelineSummary();

  const handleRefresh = async () => {
    await Promise.all([
      refetchDeals(),
      refetchLeads(),
      refetchSummary(),
    ]);
  };

  const handleDealCreated = () => {
    setShowDealModal(false);
    setDealToCreate(null);
    queryClient.invalidateQueries({ queryKey: ['deals'] });
    queryClient.invalidateQueries({ queryKey: ['pipelineSummary'] });
  };

  const handleDealUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['deals'] });
    queryClient.invalidateQueries({ queryKey: ['pipelineSummary'] });
  };

  const handleDealDeleted = () => {
    setSelectedDeal(null);
    queryClient.invalidateQueries({ queryKey: ['deals'] });
    queryClient.invalidateQueries({ queryKey: ['pipelineSummary'] });
  };

  const handleLeadCreated = () => {
    setShowLeadModal(false);
    queryClient.invalidateQueries({ queryKey: ['leads'] });
  };

  const handleLeadDeleted = () => {
    setSelectedLead(null);
    queryClient.invalidateQueries({ queryKey: ['leads'] });
  };

  const handleConvertToDeal = (lead: Lead) => {
    setSelectedLead(null);
    setDealToCreate({
      title: `${lead.name}'s Deal`,
      value: 0,
      contact: {
        _id: lead._id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
      },
    });
    setShowDealModal(true);
  };

  const filteredDeals = (deals || []).filter(deal => {
    const matchesSearch = deal.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         deal.contact?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = !selectedStage || deal.stage === selectedStage;
    return matchesSearch && matchesStage;
  });

  const filteredLeads = (leads || []).filter(lead =>
    lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoadingDeals || isLoadingLeads || isLoadingSummary) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#a855f7" />
        <Text style={styles.loadingText}>Loading CRM...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-down" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CRM</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => activeTab === 'leads' ? setShowLeadModal(true) : setShowDealModal(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6b7280" />
        <TextInput
          style={styles.searchInput}
          placeholder={activeTab === 'leads' ? 'Search leads...' : 'Search deals...'}
          placeholderTextColor="#6b7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Actions Row */}
      <View style={styles.quickActionsRow}>
        <TouchableOpacity
          style={styles.quickActionBtn}
          onPress={() => navigation.navigate('Estimates')}
        >
          <Ionicons name="document-text-outline" size={20} color="#a855f7" />
          <Text style={styles.quickActionText}>Estimates</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionBtn}
          onPress={() => navigation.navigate('Invoices')}
        >
          <Ionicons name="receipt-outline" size={20} color="#22c55e" />
          <Text style={styles.quickActionText}>Invoices</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pipeline' && styles.activeTab]}
          onPress={() => setActiveTab('pipeline')}
        >
          <Ionicons
            name="analytics-outline"
            size={18}
            color={activeTab === 'pipeline' ? '#a855f7' : '#6b7280'}
          />
          <Text style={[styles.tabText, activeTab === 'pipeline' && styles.activeTabText]}>
            Pipeline
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'deals' && styles.activeTab]}
          onPress={() => setActiveTab('deals')}
        >
          <Ionicons
            name="briefcase-outline"
            size={18}
            color={activeTab === 'deals' ? '#a855f7' : '#6b7280'}
          />
          <Text style={[styles.tabText, activeTab === 'deals' && styles.activeTabText]}>
            Deals ({(deals || []).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'leads' && styles.activeTab]}
          onPress={() => setActiveTab('leads')}
        >
          <Ionicons
            name="people-outline"
            size={18}
            color={activeTab === 'leads' ? '#a855f7' : '#6b7280'}
          />
          <Text style={[styles.tabText, activeTab === 'leads' && styles.activeTabText]}>
            Leads ({(leads || []).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'pipeline' && <PipelineTab summary={summary} deals={deals || []} onStageSelect={(stage) => {
        setSelectedStage(stage);
        setActiveTab('deals');
      }} />}
      {activeTab === 'deals' && <DealsTab
        deals={filteredDeals}
        refreshing={isRefetchingDeals}
        onRefresh={handleRefresh}
        onDealPress={(deal) => setSelectedDeal(deal)}
        onAddDeal={() => setShowDealModal(true)}
        selectedStage={selectedStage}
        onStageChange={setSelectedStage}
      />}
      {activeTab === 'leads' && <LeadsTab
        leads={filteredLeads}
        refreshing={isRefetchingLeads}
        onRefresh={handleRefresh}
        onLeadPress={(lead) => setSelectedLead(lead)}
        onAddLead={() => setShowLeadModal(true)}
      />}

      {/* Modals */}
      <DealModal
        deal={selectedDeal}
        dealToCreate={dealToCreate}
        isVisible={showDealModal}
        onClose={() => {
          setSelectedDeal(null);
          setShowDealModal(false);
          setDealToCreate(null);
        }}
        onDealCreated={handleDealCreated}
        onDealUpdated={handleDealUpdated}
        onDealDeleted={handleDealDeleted}
      />
      <LeadModal
        lead={selectedLead}
        isVisible={showLeadModal}
        onClose={() => {
          setSelectedLead(null);
          setShowLeadModal(false);
        }}
        onLeadCreated={handleLeadCreated}
        onLeadDeleted={handleLeadDeleted}
        onConvertToDeal={handleConvertToDeal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0f',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e1e2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#a855f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e2e',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    marginLeft: 12,
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#1e1e2e',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  activeTab: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  tabText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#a855f7',
  },
  quickActionsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e1e2e',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
