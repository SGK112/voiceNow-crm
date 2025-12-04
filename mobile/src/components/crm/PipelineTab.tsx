import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Deal, PipelineSummary, STAGES } from '../../types';

interface PipelineTabProps {
  summary: PipelineSummary | null;
  deals: Deal[];
  onStageSelect: (stage: string) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const PipelineTab: React.FC<PipelineTabProps> = ({ summary, deals, onStageSelect }) => (
  <ScrollView style={styles.pipelineContainer} showsVerticalScrollIndicator={false}>
    {/* Summary Cards */}
    {summary?.overall && (
      <View style={styles.summaryCards}>
        <View style={[styles.summaryCard, { backgroundColor: '#1e1e2e' }]}>
          <Text style={styles.summaryLabel}>Total Pipeline</Text>
          <Text style={styles.summaryValue}>{formatCurrency(summary.overall.totalValue || 0)}</Text>
          <Text style={styles.summarySubtext}>{summary.overall.totalDeals || 0} deals</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#1e1e2e' }]}>
          <Text style={styles.summaryLabel}>Weighted Value</Text>
          <Text style={styles.summaryValue}>{formatCurrency(summary.overall.weightedValue || 0)}</Text>
          <Text style={styles.summarySubtext}>Based on probability</Text>
        </View>
      </View>
    )}

    {/* Pipeline Stages */}
    <Text style={styles.sectionTitle}>Pipeline Stages</Text>
    {STAGES.map((stage) => {
      const stageDeals = (deals || []).filter(d => d.stage === stage.key);
      const stageValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);

      return (
        <TouchableOpacity
          key={stage.key}
          style={styles.stageCard}
          onPress={() => onStageSelect(stage.key)}
        >
          <View style={styles.stageHeader}>
            <View style={[styles.stageIndicator, { backgroundColor: stage.color }]} />
            <Text style={styles.stageName}>{stage.label}</Text>
            <View style={styles.stageBadge}>
              <Text style={styles.stageBadgeText}>{stageDeals.length}</Text>
            </View>
          </View>
          <View style={styles.stageStats}>
            <Text style={styles.stageValue}>{formatCurrency(stageValue)}</Text>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </View>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

const styles = StyleSheet.create({
  pipelineContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  summarySubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  stageCard: {
    backgroundColor: '#1e1e2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stageIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  stageName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  stageBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stageBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  stageStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  stageValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#a855f7',
  },
});

export default PipelineTab;
