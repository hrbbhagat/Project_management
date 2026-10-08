import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { Colors } from '../../constants/colors';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';
import { taskApi } from '../../services/api/taskApi';
import { Task, TaskStatus, TaskPriority } from '../../types';
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

type Props = NativeStackScreenProps<RootStackParamList, 'TaskDetail'>;

export const TaskDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { taskId } = route.params;

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Task Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<TaskStatus>('PENDING');
  const [editPriority, setEditPriority] = useState<TaskPriority>('MEDIUM');
  const [editDueDate, setEditDueDate] = useState('');
  const [editHours, setEditHours] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchTaskDetails = async () => {
    try {
      const response = await taskApi.getTaskById(taskId);
      if (response.success && response.data) {
        setTask(response.data);
        setEditTitle(response.data.title);
        setEditDescription(response.data.description || '');
        setEditStatus(response.data.status);
        setEditPriority(response.data.priority);
        setEditDueDate(response.data.due_date ? response.data.due_date.split('T')[0] : '');
        setEditHours(response.data.estimated_hours ? String(response.data.estimated_hours) : '');
      }
    } catch (err: any) {
      console.error('[TaskDetailScreen] Fetch error:', err.message);
      Alert.alert('Error', err.message || 'Failed to load task details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTaskDetails();
  };

  const handleToggleCompletion = async () => {
    if (!task) return;
    const isCompleted = task.status === 'DONE' || task.status === 'COMPLETED';
    const newStatus: TaskStatus = isCompleted ? 'PENDING' : 'DONE';

    try {
      const response = await taskApi.updateTask(task.id, { status: newStatus });
      if (response.success && response.data) {
        setTask(response.data);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update task status.');
    }
  };

  const handleUpdateTask = async () => {
    if (!editTitle.trim()) {
      setModalError('Task title cannot be empty.');
      return;
    }

    try {
      setSaving(true);
      setModalError(null);

      const response = await taskApi.updateTask(taskId, {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        status: editStatus,
        priority: editPriority,
        due_date: editDueDate.trim() || null,
        estimated_hours: editHours ? parseFloat(editHours) : undefined,
      });

      if (response.success && response.data) {
        setTask(response.data);
        setEditModalVisible(false);
        Alert.alert('Success', 'Task updated successfully.');
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to update task.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to permanently delete this deliverable?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await taskApi.deleteTask(taskId);
              Alert.alert('Deleted', 'Task deleted successfully.');
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete task.');
            }
          },
        },
      ]
    );
  };

  if (loading && !refreshing) {
    return <LoadingSpinner fullScreen message="Loading task details..." />;
  }

  if (!task) {
    return (
      <ScreenContainer>
        <EmptyState
          icon="alert-circle-outline"
          title="Task Not Found"
          description="This deliverable may have been deleted or access is restricted."
          actionTitle="Go Back"
          onAction={() => navigation.goBack()}
        />
      </ScreenContainer>
    );
  }

  const isDone = task.status === 'DONE' || task.status === 'COMPLETED';

  return (
    <ScreenContainer scrollable refreshing={refreshing} onRefresh={onRefresh}>
      <Card variant="elevated" style={styles.headerCard}>
        {/* Project Link Banner */}
        {task.project_name ? (
          <TouchableOpacity
            style={styles.projectPill}
            onPress={() =>
              navigation.navigate('ProjectDetail', {
                projectId: task.project_id,
                projectName: task.project_name,
              })
            }
          >
            <Ionicons name="folder-outline" size={14} color={Colors.primary} />
            <Text style={styles.projectPillText}>{task.project_name}</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
          </TouchableOpacity>
        ) : null}

        {/* Title and Badges */}
        <Text style={[styles.title, isDone && styles.titleCompleted]}>
          {task.title}
        </Text>

        <View style={styles.badgeRow}>
          <Badge label={task.status} variant="status" />
          <Badge label={task.priority} variant="priority" />
        </View>

        {/* Description */}
        {task.description ? (
          <Text style={styles.description}>{task.description}</Text>
        ) : (
          <Text style={styles.noDescription}>No description provided.</Text>
        )}

        {/* Mark Complete Action Button */}
        <Button
          title={isDone ? '✓ Mark Incomplete' : '✓ Mark as Completed'}
          variant={isDone ? 'secondary' : 'primary'}
          onPress={handleToggleCompletion}
          style={styles.completeButton}
        />
      </Card>

      {/* Task Details Metadata */}
      <Text style={styles.sectionTitle}>Deliverable Info</Text>

      <Card variant="elevated">
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={18} color={Colors.textSecondary} />
          <Text style={styles.infoLabel}>Created By</Text>
          <Text style={styles.infoVal}>{task.creator_name || 'Project Owner'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Ionicons name="person-add-outline" size={18} color={Colors.textSecondary} />
          <Text style={styles.infoLabel}>Assigned To</Text>
          <Text style={styles.infoVal}>{task.assignee_name || 'Unassigned'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} />
          <Text style={styles.infoLabel}>Due Date</Text>
          <Text style={styles.infoVal}>{formatDate(task.due_date)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
          <Text style={styles.infoLabel}>Estimated Hours</Text>
          <Text style={styles.infoVal}>
            {task.estimated_hours ? `${task.estimated_hours} hrs` : 'None'}
          </Text>
        </View>

        {task.completed_at ? (
          <>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle-outline" size={18} color={Colors.success} />
              <Text style={styles.infoLabel}>Completed At</Text>
              <Text style={styles.infoVal}>{formatDate(task.completed_at)}</Text>
            </View>
          </>
        ) : null}
      </Card>

      {/* Action Buttons: Edit & Delete */}
      <View style={styles.actionRow}>
        <Button
          title="Edit Task"
          variant="outline"
          onPress={() => setEditModalVisible(true)}
          icon={<Ionicons name="create-outline" size={18} color={Colors.primary} />}
          style={{ flex: 1, marginRight: Spacing.sm }}
        />
        <Button
          title="Delete"
          variant="danger"
          onPress={handleDeleteTask}
          icon={<Ionicons name="trash-outline" size={18} color={Colors.textInverse} />}
          style={{ paddingHorizontal: Spacing.lg }}
        />
      </View>

      {/* Edit Task Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Deliverable</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {modalError ? (
                <View style={styles.modalError}>
                  <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                  <Text style={styles.modalErrorText}>{modalError}</Text>
                </View>
              ) : null}

              <Input
                label="Task Title *"
                value={editTitle}
                onChangeText={setEditTitle}
              />

              <Input
                label="Description"
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
                numberOfLines={3}
                style={{ height: 72 }}
              />

              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.statusSelectRow}>
                {(['PENDING', 'IN_PROGRESS', 'DONE', 'BLOCKED'] as TaskStatus[]).map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.statusOption,
                      editStatus === st && styles.statusOptionSelected,
                    ]}
                    onPress={() => setEditStatus(st)}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        editStatus === st && styles.statusOptionTextSelected,
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Priority</Text>
              <View style={styles.statusSelectRow}>
                {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as TaskPriority[]).map((pr) => (
                  <TouchableOpacity
                    key={pr}
                    style={[
                      styles.statusOption,
                      editPriority === pr && styles.statusOptionSelected,
                    ]}
                    onPress={() => setEditPriority(pr)}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        editPriority === pr && styles.statusOptionTextSelected,
                      ]}
                    >
                      {pr}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Due Date (YYYY-MM-DD)"
                value={editDueDate}
                onChangeText={setEditDueDate}
                leftIcon={<Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />}
              />

              <Input
                label="Estimated Hours"
                value={editHours}
                onChangeText={setEditHours}
                keyboardType="numeric"
                leftIcon={<Ionicons name="time-outline" size={20} color={Colors.textSecondary} />}
              />

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setEditModalVisible(false)}
                  style={{ flex: 1, marginRight: Spacing.sm }}
                />
                <Button
                  title="Save Changes"
                  onPress={handleUpdateTask}
                  loading={saving}
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
  headerCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  projectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: Spacing.sm,
  },
  projectPillText: {
    ...Typography.small,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  title: {
    ...Typography.h2,
    fontSize: 22,
    marginBottom: Spacing.xs,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginVertical: Spacing.xs,
  },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginVertical: Spacing.sm,
  },
  noDescription: {
    ...Typography.caption,
    fontStyle: 'italic',
    color: Colors.textMuted,
    marginVertical: Spacing.sm,
  },
  completeButton: {
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  infoLabel: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  infoVal: {
    ...Typography.bodyMedium,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    marginBottom: Spacing.xxl,
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
    fontSize: 10,
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
