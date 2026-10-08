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
import { taskApi } from '../../services/api/taskApi';
import { projectApi } from '../../services/api/projectApi';
import { Task, Project, TaskStatus, TaskPriority } from '../../types';
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

const STATUS_FILTERS: { label: string; value?: TaskStatus }[] = [
  { label: 'All' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Done', value: 'DONE' },
  { label: 'Blocked', value: 'BLOCKED' },
];

const PRIORITY_FILTERS: { label: string; value?: TaskPriority }[] = [
  { label: 'All' },
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Urgent', value: 'URGENT' },
];

export const TasksScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | undefined>(undefined);
  const [selectedPriority, setSelectedPriority] = useState<TaskPriority | undefined>(undefined);

  // Create Task Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        taskApi.getTasks({
          search: search.trim() || undefined,
          status: selectedStatus,
          priority: selectedPriority,
          sortBy: 'created_at',
          order: 'DESC',
        }),
        projectApi.getProjects({ limit: 50 }),
      ]);

      if (tasksRes.success && tasksRes.data) {
        setTasks(tasksRes.data);
      }
      if (projectsRes.success && projectsRes.data) {
        setProjects(projectsRes.data);
        if (projectsRes.data.length > 0 && !selectedProjectId) {
          setSelectedProjectId(projectsRes.data[0].id);
        }
      }
    } catch (err: any) {
      console.error('[TasksScreen] Fetch error:', err.message);
      Alert.alert('Error', err.message || 'Failed to fetch tasks.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [search, selectedStatus, selectedPriority])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const handleToggleTaskCompletion = async (task: Task) => {
    const isCompleted = task.status === 'DONE' || task.status === 'COMPLETED';
    const newStatus: TaskStatus = isCompleted ? 'PENDING' : 'DONE';

    try {
      const response = await taskApi.updateTask(task.id, {
        status: newStatus,
      });

      if (response.success) {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update task status.');
    }
  };

  const handleCreateTask = async () => {
    if (!selectedProjectId) {
      setFormError('Please select or create a project first.');
      return;
    }

    if (!title.trim()) {
      setFormError('Task title is required.');
      return;
    }

    try {
      setCreating(true);
      setFormError(null);

      const response = await taskApi.createTask({
        project_id: selectedProjectId,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        due_date: dueDate.trim() || null,
        estimated_hours: estimatedHours ? parseFloat(estimatedHours) : undefined,
      });

      if (response.success) {
        setModalVisible(false);
        setTitle('');
        setDescription('');
        setPriority('MEDIUM');
        setDueDate('');
        setEstimatedHours('');
        fetchTasks();
      } else {
        setFormError(response.message || 'Failed to create task.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to create task.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <ScreenContainer scrollable refreshing={refreshing} onRefresh={onRefresh}>
      {/* Search Input */}
      <Input
        placeholder="Search tasks by title..."
        value={search}
        onChangeText={setSearch}
        leftIcon={<Ionicons name="search-outline" size={20} color={Colors.textSecondary} />}
        containerStyle={styles.searchContainer}
      />

      {/* Status Filters */}
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

      {/* Header and Add Task Action */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Tasks ({tasks.length})</Text>
        <Button
          title="+ New Task"
          size="sm"
          onPress={() => setModalVisible(true)}
          style={styles.addButton}
        />
      </View>

      {/* Tasks List */}
      {loading && !refreshing ? (
        <LoadingSpinner message="Loading tasks..." />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon="checkbox-outline"
          title="No Tasks Found"
          description={
            search || selectedStatus || selectedPriority
              ? 'Try adjusting your filters or search keywords.'
              : 'You have no assigned tasks. Tap "+ New Task" to create one!'
          }
          actionTitle="+ Create Task"
          onAction={() => setModalVisible(true)}
          style={styles.emptyState}
        />
      ) : (
        tasks.map((task) => {
          const isDone = task.status === 'DONE' || task.status === 'COMPLETED';
          return (
            <Card
              key={task.id}
              variant="elevated"
              style={styles.taskCard}
              onPress={() =>
                navigation.navigate('TaskDetail', {
                  taskId: task.id,
                  taskTitle: task.title,
                })
              }
            >
              <View style={styles.cardHeader}>
                <TouchableOpacity
                  onPress={() => handleToggleTaskCompletion(task)}
                  style={styles.checkboxTouch}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={isDone ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={isDone ? Colors.success : Colors.textSecondary}
                  />
                </TouchableOpacity>

                <Text
                  style={[
                    styles.taskTitle,
                    isDone && styles.taskTitleCompleted,
                  ]}
                  numberOfLines={1}
                >
                  {task.title}
                </Text>

                <Badge label={task.priority} variant="priority" />
              </View>

              {task.description ? (
                <Text style={styles.taskDescription} numberOfLines={2}>
                  {task.description}
                </Text>
              ) : null}

              <View style={styles.cardFooter}>
                <Badge label={task.status} variant="status" />

                {task.project_name ? (
                  <View style={styles.metaBadge}>
                    <Ionicons name="folder-outline" size={13} color={Colors.textSecondary} />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {task.project_name}
                    </Text>
                  </View>
                ) : null}

                {task.due_date ? (
                  <View style={styles.metaBadge}>
                    <Ionicons name="calendar-outline" size={13} color={Colors.textSecondary} />
                    <Text style={styles.metaText}>{formatDate(task.due_date)}</Text>
                  </View>
                ) : null}
              </View>
            </Card>
          );
        })
      )}

      {/* Create Task Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Task</Text>
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

              {/* Project Picker */}
              <Text style={styles.inputLabel}>Parent Project *</Text>
              {projects.length === 0 ? (
                <Text style={styles.noProjectsNote}>
                  ⚠️ No projects found. Please create a project first.
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.projectSelectScroll}
                >
                  {projects.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.projectOption,
                        selectedProjectId === p.id && styles.projectOptionSelected,
                      ]}
                      onPress={() => setSelectedProjectId(p.id)}
                    >
                      <Text
                        style={[
                          styles.projectOptionText,
                          selectedProjectId === p.id && styles.projectOptionTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <Input
                label="Task Title *"
                placeholder="e.g. Implement user login API"
                value={title}
                onChangeText={setTitle}
              />

              <Input
                label="Description"
                placeholder="Task description and requirements..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                style={{ height: 72 }}
              />

              <Text style={styles.inputLabel}>Priority</Text>
              <View style={styles.statusSelectRow}>
                {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as TaskPriority[]).map((pr) => (
                  <TouchableOpacity
                    key={pr}
                    style={[
                      styles.statusOption,
                      priority === pr && styles.statusOptionSelected,
                    ]}
                    onPress={() => setPriority(pr)}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        priority === pr && styles.statusOptionTextSelected,
                      ]}
                    >
                      {pr}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Due Date (YYYY-MM-DD)"
                placeholder="2026-10-31"
                value={dueDate}
                onChangeText={setDueDate}
                leftIcon={<Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />}
              />

              <Input
                label="Estimated Hours"
                placeholder="e.g. 5"
                value={estimatedHours}
                onChangeText={setEstimatedHours}
                keyboardType="numeric"
                leftIcon={<Ionicons name="time-outline" size={20} color={Colors.textSecondary} />}
              />

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setModalVisible(false)}
                  style={{ flex: 1, marginRight: Spacing.sm }}
                />
                <Button
                  title="Create Task"
                  onPress={handleCreateTask}
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
  taskCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  checkboxTouch: {
    marginRight: Spacing.sm,
  },
  taskTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    fontSize: 16,
    flex: 1,
    marginRight: Spacing.sm,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  taskDescription: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginLeft: 30,
    marginBottom: Spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginLeft: 30,
    marginTop: Spacing.xs,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...Typography.small,
    color: Colors.textSecondary,
    maxWidth: 130,
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
    maxHeight: '90%',
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
  noProjectsNote: {
    ...Typography.caption,
    color: Colors.warning,
    marginBottom: Spacing.md,
  },
  projectSelectScroll: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  projectOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: 160,
  },
  projectOptionSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  projectOptionText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  projectOptionTextSelected: {
    color: Colors.primaryDark,
    fontWeight: '700',
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
