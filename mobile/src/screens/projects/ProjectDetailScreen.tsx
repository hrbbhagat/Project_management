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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { Colors } from '../../constants/colors';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';
import { projectApi } from '../../services/api/projectApi';
import { taskApi } from '../../services/api/taskApi';
import { Project, Task, ProjectStatus, TaskPriority, TaskStatus } from '../../types';
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

type Props = NativeStackScreenProps<RootStackParamList, 'ProjectDetail'>;

export const ProjectDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { projectId } = route.params;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Project Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<ProjectStatus>('NOT_STARTED');
  const [editDueDate, setEditDueDate] = useState('');

  // Add Task Modal State
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('MEDIUM');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskHours, setTaskHours] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchProjectData = async () => {
    try {
      const [projectRes, tasksRes] = await Promise.all([
        projectApi.getProjectById(projectId),
        taskApi.getTasks({ project_id: projectId, sortBy: 'created_at', order: 'DESC' }),
      ]);

      if (projectRes.success && projectRes.data) {
        setProject(projectRes.data);
        setEditName(projectRes.data.name);
        setEditDescription(projectRes.data.description || '');
        setEditStatus(projectRes.data.status);
        setEditDueDate(projectRes.data.due_date ? projectRes.data.due_date.split('T')[0] : '');
      }

      if (tasksRes.success && tasksRes.data) {
        setTasks(tasksRes.data);
      }
    } catch (err: any) {
      console.error('[ProjectDetailScreen] Error:', err.message);
      Alert.alert('Error', err.message || 'Failed to load project details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProjectData();
  };

  const handleUpdateProject = async () => {
    if (!editName.trim()) {
      setModalError('Project name cannot be empty.');
      return;
    }

    try {
      setSavingProject(true);
      setModalError(null);

      const response = await projectApi.updateProject(projectId, {
        name: editName.trim(),
        description: editDescription.trim() || null,
        status: editStatus,
        due_date: editDueDate.trim() || null,
      });

      if (response.success && response.data) {
        setProject(response.data);
        setEditModalVisible(false);
        Alert.alert('Success', 'Project updated successfully.');
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to update project.');
    } finally {
      setSavingProject(false);
    }
  };

  const handleDeleteProject = () => {
    Alert.alert(
      'Delete Project',
      'Are you sure you want to delete this workspace? All associated tasks will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await projectApi.deleteProject(projectId);
              Alert.alert('Deleted', 'Project deleted successfully.');
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete project.');
            }
          },
        },
      ]
    );
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) {
      setModalError('Task title is required.');
      return;
    }

    try {
      setCreatingTask(true);
      setModalError(null);

      const response = await taskApi.createTask({
        project_id: projectId,
        title: taskTitle.trim(),
        description: taskDescription.trim() || null,
        priority: taskPriority,
        due_date: taskDueDate.trim() || null,
        estimated_hours: taskHours ? parseFloat(taskHours) : undefined,
      });

      if (response.success) {
        setTaskModalVisible(false);
        setTaskTitle('');
        setTaskDescription('');
        setTaskPriority('MEDIUM');
        setTaskDueDate('');
        setTaskHours('');
        fetchProjectData();
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to create task.');
    } finally {
      setCreatingTask(false);
    }
  };

  if (loading && !refreshing) {
    return <LoadingSpinner fullScreen message="Loading workspace details..." />;
  }

  if (!project) {
    return (
      <ScreenContainer>
        <EmptyState
          icon="alert-circle-outline"
          title="Project Not Found"
          description="This project may have been deleted or you do not have permission to view it."
          actionTitle="Go Back"
          onAction={() => navigation.goBack()}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable refreshing={refreshing} onRefresh={onRefresh}>
      {/* Project Overview Card */}
      <Card variant="elevated" style={styles.projectHeaderCard}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {project.name}
          </Text>
          <Badge label={project.status} variant="status" />
        </View>

        {project.description ? (
          <Text style={styles.description}>{project.description}</Text>
        ) : null}

        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Owner</Text>
            <Text style={styles.infoVal}>{project.owner_name || 'You'}</Text>
          </View>

          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Role</Text>
            <Text style={styles.infoVal}>{project.user_role || 'OWNER'}</Text>
          </View>

          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Due Date</Text>
            <Text style={styles.infoVal}>{formatDate(project.due_date)}</Text>
          </View>
        </View>

        {/* Action Buttons: Edit & Delete */}
        <View style={styles.actionRow}>
          <Button
            title="Edit Project"
            variant="outline"
            size="sm"
            onPress={() => setEditModalVisible(true)}
            icon={<Ionicons name="create-outline" size={16} color={Colors.primary} />}
            style={{ flex: 1, marginRight: Spacing.sm }}
          />
          <Button
            title="Delete"
            variant="danger"
            size="sm"
            onPress={handleDeleteProject}
            icon={<Ionicons name="trash-outline" size={16} color={Colors.textInverse} />}
            style={{ paddingHorizontal: Spacing.md }}
          />
        </View>
      </Card>

      {/* Project Tasks Header */}
      <View style={styles.sectionHeaderRow}>
        <View>
          <Text style={styles.sectionTitle}>Project Tasks</Text>
          <Text style={styles.sectionSubtitle}>
            {tasks.length} task{tasks.length === 1 ? '' : 's'} in this workspace
          </Text>
        </View>
        <Button
          title="+ Add Task"
          size="sm"
          onPress={() => setTaskModalVisible(true)}
        />
      </View>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <EmptyState
          icon="checkbox-outline"
          title="No Tasks in Project"
          description="Create deliverables and assign milestones to your team."
          actionTitle="+ Add First Task"
          onAction={() => setTaskModalVisible(true)}
          style={{ marginTop: Spacing.md }}
        />
      ) : (
        tasks.map((task) => (
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
            <View style={styles.taskCardHeader}>
              <Text style={styles.taskTitle} numberOfLines={1}>
                {task.title}
              </Text>
              <Badge label={task.priority} variant="priority" />
            </View>

            {task.description ? (
              <Text style={styles.taskDesc} numberOfLines={2}>
                {task.description}
              </Text>
            ) : null}

            <View style={styles.taskFooter}>
              <Badge label={task.status} variant="status" />
              {task.due_date ? (
                <View style={styles.taskDateRow}>
                  <Ionicons name="calendar-outline" size={12} color={Colors.textSecondary} />
                  <Text style={styles.taskDateText}>{formatDate(task.due_date)}</Text>
                </View>
              ) : null}
            </View>
          </Card>
        ))
      )}

      {/* Edit Project Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Project</Text>
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
                label="Project Name *"
                value={editName}
                onChangeText={setEditName}
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
                {(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'] as ProjectStatus[]).map((st) => (
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
                      {st.replace('_', ' ')}
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

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setEditModalVisible(false)}
                  style={{ flex: 1, marginRight: Spacing.sm }}
                />
                <Button
                  title="Save Changes"
                  onPress={handleUpdateProject}
                  loading={savingProject}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Task Modal */}
      <Modal
        visible={taskModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTaskModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Task to Project</Text>
              <TouchableOpacity onPress={() => setTaskModalVisible(false)}>
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
                placeholder="e.g. Design app login wireframe"
                value={taskTitle}
                onChangeText={setTaskTitle}
              />

              <Input
                label="Description"
                placeholder="Task details and acceptance requirements..."
                value={taskDescription}
                onChangeText={setTaskDescription}
                multiline
                numberOfLines={3}
                style={{ height: 70 }}
              />

              <Text style={styles.inputLabel}>Priority</Text>
              <View style={styles.statusSelectRow}>
                {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as TaskPriority[]).map((pr) => (
                  <TouchableOpacity
                    key={pr}
                    style={[
                      styles.statusOption,
                      taskPriority === pr && styles.statusOptionSelected,
                    ]}
                    onPress={() => setTaskPriority(pr)}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        taskPriority === pr && styles.statusOptionTextSelected,
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
                value={taskDueDate}
                onChangeText={setTaskDueDate}
                leftIcon={<Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />}
              />

              <Input
                label="Estimated Hours"
                placeholder="e.g. 4.5"
                value={taskHours}
                onChangeText={setTaskHours}
                keyboardType="numeric"
                leftIcon={<Ionicons name="time-outline" size={20} color={Colors.textSecondary} />}
              />

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setTaskModalVisible(false)}
                  style={{ flex: 1, marginRight: Spacing.sm }}
                />
                <Button
                  title="Create Task"
                  onPress={handleCreateTask}
                  loading={creatingTask}
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
  projectHeaderCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.h2,
    fontSize: 22,
    flex: 1,
    marginRight: Spacing.sm,
  },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginVertical: Spacing.sm,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  infoCol: {
    alignItems: 'center',
  },
  infoLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  infoVal: {
    ...Typography.bodyMedium,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.h3,
  },
  sectionSubtitle: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  taskCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  taskTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    flex: 1,
    marginRight: Spacing.sm,
  },
  taskDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  taskDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskDateText: {
    ...Typography.small,
    color: Colors.textSecondary,
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
