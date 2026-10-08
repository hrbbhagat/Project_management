import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { Colors } from '../../constants/colors';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';
import { projectApi } from '../../services/api/projectApi';
import { Project, ProjectStatus } from '../../types';
import {
  ScreenContainer,
  Card,
  Badge,
  Input,
  Button,
  LoadingSpinner,
  EmptyState,
} from '../../components/common';
import { formatDate } from '../../utils/formatters';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const STATUS_FILTERS: { label: string; value?: ProjectStatus }[] = [
  { label: 'All' },
  { label: 'Not Started', value: 'NOT_STARTED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'On Hold', value: 'ON_HOLD' },
];

export const ProjectsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus | undefined>(undefined);

  // Create Project Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('NOT_STARTED');
  const [dueDate, setDueDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      const response = await projectApi.getProjects({
        search: search.trim() || undefined,
        status: selectedStatus,
        sortBy: 'created_at',
        order: 'DESC',
      });

      if (response.success && response.data) {
        setProjects(response.data);
      }
    } catch (err: any) {
      console.error('[ProjectsScreen] Fetch error:', err.message);
      Alert.alert('Error', err.message || 'Failed to fetch projects.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProjects();
    }, [search, selectedStatus])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProjects();
  };

  const handleCreateProject = async () => {
    if (!name.trim()) {
      setFormError('Project name is required.');
      return;
    }

    try {
      setCreating(true);
      setFormError(null);

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        status,
        due_date: dueDate.trim() || null,
      };

      const response = await projectApi.createProject(payload);

      if (response.success) {
        setModalVisible(false);
        setName('');
        setDescription('');
        setStatus('NOT_STARTED');
        setDueDate('');
        fetchProjects();
      } else {
        setFormError(response.message || 'Failed to create project.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to create project.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <ScreenContainer scrollable refreshing={refreshing} onRefresh={onRefresh}>
      {/* Search Bar */}
      <Input
        placeholder="Search projects by name..."
        value={search}
        onChangeText={setSearch}
        leftIcon={<Ionicons name="search-outline" size={20} color={Colors.textSecondary} />}
        containerStyle={styles.searchContainer}
      />

      {/* Status Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {STATUS_FILTERS.map((filter) => {
          const isSelected = selectedStatus === filter.value;
          return (
            <TouchableOpacity
              key={filter.label}
              style={[styles.filterChip, isSelected && styles.filterChipSelected]}
              onPress={() => setSelectedStatus(filter.value)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isSelected && styles.filterChipTextSelected,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Header and Add Button */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          Projects ({projects.length})
        </Text>
        <Button
          title="+ New Project"
          onPress={() => setModalVisible(true)}
          size="sm"
          style={styles.addButton}
        />
      </View>

      {/* Projects List */}
      {loading && !refreshing ? (
        <LoadingSpinner message="Loading projects..." />
      ) : projects.length === 0 ? (
        <EmptyState
          icon="folder-open-outline"
          title="No Projects Found"
          description={
            search || selectedStatus
              ? 'Try changing your search keywords or filter.'
              : 'You have no active projects. Tap "+ New Project" to get started!'
          }
          actionTitle="+ Create Project"
          onAction={() => setModalVisible(true)}
          style={styles.emptyState}
        />
      ) : (
        projects.map((project) => (
          <Card
            key={project.id}
            variant="elevated"
            style={styles.projectCard}
            onPress={() =>
              navigation.navigate('ProjectDetail', {
                projectId: project.id,
                projectName: project.name,
              })
            }
          >
            <View style={styles.cardHeader}>
              <Text style={styles.projectName} numberOfLines={1}>
                {project.name}
              </Text>
              <Badge label={project.status} variant="status" />
            </View>

            {project.description ? (
              <Text style={styles.projectDescription} numberOfLines={2}>
                {project.description}
              </Text>
            ) : null}

            <View style={styles.cardFooter}>
              <View style={styles.metaBadge}>
                <Ionicons name="checkbox-outline" size={14} color={Colors.primary} />
                <Text style={styles.metaText}>{project.total_tasks ?? 0} Tasks</Text>
              </View>

              <View style={styles.metaBadge}>
                <Ionicons name="people-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{project.total_members ?? 1} Members</Text>
              </View>

              {project.due_date ? (
                <View style={styles.metaBadge}>
                  <Ionicons name="calendar-outline" size={14} color={Colors.warning} />
                  <Text style={styles.metaText}>{formatDate(project.due_date)}</Text>
                </View>
              ) : null}
            </View>
          </Card>
        ))
      )}

      {/* Create Project Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Project</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {formError ? (
                <View style={styles.modalError}>
                  <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                  <Text style={styles.modalErrorText}>{formError}</Text>
                </View>
              ) : null}

              <Input
                label="Project Name *"
                placeholder="e.g. Mobile Application V1"
                value={name}
                onChangeText={setName}
              />

              <Input
                label="Description"
                placeholder="Brief summary of the workspace goals..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                style={{ height: 72 }}
              />

              <Text style={styles.inputLabel}>Initial Status</Text>
              <View style={styles.statusSelectRow}>
                {(['NOT_STARTED', 'IN_PROGRESS', 'PLANNING'] as ProjectStatus[]).map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.statusOption,
                      status === st && styles.statusOptionSelected,
                    ]}
                    onPress={() => setStatus(st)}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        status === st && styles.statusOptionTextSelected,
                      ]}
                    >
                      {st.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Due Date (Optional)"
                placeholder="YYYY-MM-DD"
                value={dueDate}
                onChangeText={setDueDate}
                leftIcon={<Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />}
              />

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setModalVisible(false)}
                  style={{ flex: 1, marginRight: Spacing.sm }}
                />
                <Button
                  title="Create Project"
                  onPress={handleCreateProject}
                  loading={creating}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    marginBottom: Spacing.xs,
  },
  filterScroll: {
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterChipTextSelected: {
    color: Colors.textInverse,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h2,
    fontSize: 20,
  },
  addButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  projectCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  projectName: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    fontSize: 17,
    flex: 1,
    marginRight: Spacing.sm,
  },
  projectDescription: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  emptyState: {
    marginTop: Spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '85%',
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    ...Typography.h3,
  },
  modalBody: {
    paddingBottom: Spacing.xxl,
  },
  modalError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  modalErrorText: {
    ...Typography.small,
    color: Colors.danger,
    flex: 1,
  },
  inputLabel: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  statusSelectRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  statusOption: {
    flex: 1,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  statusOptionSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  statusOptionText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  statusOptionTextSelected: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: Spacing.md,
  },
});
