import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/colors';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';
import { dashboardApi } from '../../services/api/dashboardApi';
import { projectApi } from '../../services/api/projectApi';
import { taskApi } from '../../services/api/taskApi';
import { DashboardMetrics, Project, Task } from '../../types';
import { ScreenContainer, Card, Badge, LoadingSpinner } from '../../components/common';
import { formatDate } from '../../utils/formatters';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const [metricsRes, projectsRes, tasksRes] = await Promise.all([
        dashboardApi.getDashboardMetrics(),
        projectApi.getProjects({ limit: 3, sortBy: 'created_at', order: 'DESC' }),
        taskApi.getTasks({ limit: 4, sortBy: 'created_at', order: 'DESC' }),
      ]);

      if (metricsRes.success && metricsRes.data) {
        setMetrics(metricsRes.data);
      }
      if (projectsRes.success && projectsRes.data) {
        setRecentProjects(projectsRes.data);
      }
      if (tasksRes.success && tasksRes.data) {
        setRecentTasks(tasksRes.data);
      }
    } catch (err: any) {
      console.error('[DashboardScreen] Fetch error:', err.message);
      setError(err.message || 'Unable to load dashboard metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading && !refreshing) {
    return <LoadingSpinner fullScreen message="Loading dashboard metrics..." />;
  }

  return (
    <ScreenContainer scrollable refreshing={refreshing} onRefresh={onRefresh}>
      {/* Welcome Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Hello, {user?.full_name?.split(' ')[0] || 'User'} 👋
          </Text>
          <Text style={styles.subtitle}>Here is your current workload summary</Text>
        </View>
        <View style={styles.userRoleBadge}>
          <Text style={styles.userRoleText}>{user?.role || 'MEMBER'}</Text>
        </View>
      </View>

      {error ? (
        <Card variant="flat" style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={24} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchDashboardData} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </Card>
      ) : null}

      {/* Metrics Section */}
      <Text style={styles.sectionTitle}>Overview</Text>

      <View style={styles.metricsGrid}>
        {/* Total Projects */}
        <Card style={styles.metricCard}>
          <View style={[styles.iconCircle, { backgroundColor: Colors.primaryLight }]}>
            <Ionicons name="folder-outline" size={22} color={Colors.primary} />
          </View>
          <Text style={styles.metricValue}>{metrics?.totalProjects ?? 0}</Text>
          <Text style={styles.metricLabel}>Total Projects</Text>
        </Card>

        {/* Active Projects */}
        <Card style={styles.metricCard}>
          <View style={[styles.iconCircle, { backgroundColor: Colors.infoLight }]}>
            <Ionicons name="layers-outline" size={22} color={Colors.info} />
          </View>
          <Text style={styles.metricValue}>{metrics?.projectsInProgress ?? 0}</Text>
          <Text style={styles.metricLabel}>In Progress</Text>
        </Card>

        {/* Total Tasks */}
        <Card style={styles.metricCard}>
          <View style={[styles.iconCircle, { backgroundColor: '#F3E8FF' }]}>
            <Ionicons name="list-outline" size={22} color="#8B5CF6" />
          </View>
          <Text style={styles.metricValue}>{metrics?.totalTasks ?? 0}</Text>
          <Text style={styles.metricLabel}>Total Tasks</Text>
        </Card>

        {/* Completed Tasks */}
        <Card style={styles.metricCard}>
          <View style={[styles.iconCircle, { backgroundColor: Colors.successLight }]}>
            <Ionicons name="checkmark-done-outline" size={22} color={Colors.success} />
          </View>
          <Text style={styles.metricValue}>{metrics?.completedTasks ?? 0}</Text>
          <Text style={styles.metricLabel}>Completed Tasks</Text>
        </Card>
      </View>

      {/* Pending Tasks Progress Banner */}
      <Card variant="flat" style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={styles.progressTitle}>Pending Deliverables</Text>
            <Text style={styles.progressSubtitle}>
              {metrics?.pendingTasks ?? 0} task{(metrics?.pendingTasks ?? 0) === 1 ? '' : 's'} remaining
            </Text>
          </View>
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{metrics?.pendingTasks ?? 0}</Text>
          </View>
        </View>
      </Card>

      {/* Recent Projects Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Recent Projects</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: 'Projects' } as any)}>
          <Text style={styles.seeAllText}>See all</Text>
        </TouchableOpacity>
      </View>

      {recentProjects.length === 0 ? (
        <Card variant="flat" style={styles.emptyCard}>
          <Text style={styles.emptyText}>No projects yet. Create your first project!</Text>
        </Card>
      ) : (
        recentProjects.map((project) => (
          <Card
            key={project.id}
            variant="elevated"
            style={styles.itemCard}
            onPress={() =>
              navigation.navigate('ProjectDetail', {
                projectId: project.id,
                projectName: project.name,
              })
            }
          >
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle} numberOfLines={1}>
                {project.name}
              </Text>
              <Badge label={project.status} variant="status" />
            </View>
            {project.description ? (
              <Text style={styles.itemDescription} numberOfLines={2}>
                {project.description}
              </Text>
            ) : null}
            <View style={styles.itemFooter}>
              <View style={styles.metaItem}>
                <Ionicons name="checkbox-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{project.total_tasks ?? 0} tasks</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{formatDate(project.due_date)}</Text>
              </View>
            </View>
          </Card>
        ))
      )}

      {/* Recent Tasks Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Recent Tasks</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: 'Tasks' } as any)}>
          <Text style={styles.seeAllText}>See all</Text>
        </TouchableOpacity>
      </View>

      {recentTasks.length === 0 ? (
        <Card variant="flat" style={styles.emptyCard}>
          <Text style={styles.emptyText}>No tasks created yet.</Text>
        </Card>
      ) : (
        recentTasks.map((task) => (
          <Card
            key={task.id}
            variant="elevated"
            style={styles.itemCard}
            onPress={() =>
              navigation.navigate('TaskDetail', {
                taskId: task.id,
                taskTitle: task.title,
              })
            }
          >
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle} numberOfLines={1}>
                {task.title}
              </Text>
              <Badge label={task.priority} variant="priority" />
            </View>
            <View style={styles.taskMetaRow}>
              <Badge label={task.status} variant="status" style={styles.taskStatusBadge} />
              {task.project_name ? (
                <Text style={styles.taskProjectName} numberOfLines={1}>
                  📁 {task.project_name}
                </Text>
              ) : null}
            </View>
          </Card>
        ))
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  greeting: {
    ...Typography.h2,
  },
  subtitle: {
    ...Typography.caption,
    marginTop: 2,
  },
  userRoleBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  userRoleText: {
    ...Typography.small,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  errorCard: {
    padding: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    marginBottom: Spacing.md,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.danger,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  retryButton: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.danger,
    borderRadius: BorderRadius.sm,
  },
  retryText: {
    ...Typography.small,
    color: Colors.textInverse,
    fontWeight: '600',
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  seeAllText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  metricCard: {
    width: '47%',
    padding: Spacing.md,
    marginBottom: 0,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  metricValue: {
    ...Typography.h1,
    fontSize: 26,
    marginBottom: 2,
  },
  metricLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  progressCard: {
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
  },
  progressSubtitle: {
    ...Typography.caption,
    marginTop: 2,
  },
  pendingBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBadgeText: {
    ...Typography.bodyMedium,
    color: Colors.warning,
    fontWeight: '700',
  },
  itemCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  itemTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    flex: 1,
    marginRight: Spacing.sm,
  },
  itemDescription: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  taskStatusBadge: {
    marginRight: Spacing.xs,
  },
  taskProjectName: {
    ...Typography.small,
    color: Colors.textSecondary,
    flex: 1,
  },
  emptyCard: {
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});
