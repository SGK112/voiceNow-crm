import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import voiceAgentService, { VoiceAgent } from '../services/VoiceAgentService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface VoiceAgentPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (agent: VoiceAgent) => void;
  selectedAgentId?: string;
}

const VoiceAgentPicker: React.FC<VoiceAgentPickerProps> = ({
  visible,
  onClose,
  onSelect,
  selectedAgentId,
}) => {
  const [agents, setAgents] = useState<VoiceAgent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadAgents();
    }
  }, [visible]);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const fetchedAgents = await voiceAgentService.getVoiceAgents();
      setAgents(fetchedAgents);
    } catch (error) {
      console.error('Error loading voice agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGenderIcon = (gender: string) => {
    return gender === 'female' ? 'woman' : 'man';
  };

  const getGenderColor = (gender: string) => {
    return gender === 'female' ? '#ec4899' : '#3b82f6';
  };

  const handleSelect = (agent: VoiceAgent) => {
    onSelect(agent);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Choose Voice</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Agent List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading voices...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.agentList}
              showsVerticalScrollIndicator={false}
            >
              {agents.map((agent) => (
                <TouchableOpacity
                  key={agent.id}
                  style={[
                    styles.agentCard,
                    selectedAgentId === agent.id && styles.agentCardSelected,
                  ]}
                  onPress={() => handleSelect(agent)}
                  activeOpacity={0.7}
                >
                  {/* Avatar */}
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: getGenderColor(agent.gender) + '15' },
                    ]}
                  >
                    <Ionicons
                      name={getGenderIcon(agent.gender) as any}
                      size={24}
                      color={getGenderColor(agent.gender)}
                    />
                  </View>

                  {/* Info */}
                  <View style={styles.agentInfo}>
                    <View style={styles.agentNameRow}>
                      <Text style={styles.agentName}>{agent.name}</Text>
                      {agent.name === 'ARIA' && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>Default</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.agentType}>{agent.type}</Text>
                    <Text style={styles.agentDesc} numberOfLines={2}>
                      {agent.description}
                    </Text>
                  </View>

                  {/* Selection indicator */}
                  {selectedAgentId === agent.id && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  closeBtn: {
    padding: 4,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  agentList: {
    padding: 16,
  },
  agentCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  agentCardSelected: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  agentInfo: {
    flex: 1,
  },
  agentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  agentName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  defaultBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  agentType: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  agentDesc: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 18,
  },
  checkmark: {
    marginLeft: 8,
  },
});

export default VoiceAgentPicker;
