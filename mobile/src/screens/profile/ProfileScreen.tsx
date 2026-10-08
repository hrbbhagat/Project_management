import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/colors';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';
import { Config } from '../../constants/config';
import { ScreenContainer, Card, Button } from '../../components/common';
import { Ionicons } from '@expo/vector-icons';

export const ProfileScreen: React.FC = () => {
  const { user, logout, isLoading } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.full_name || 'User Profile'}</Text>
        <Text style={styles.email}>{user?.email || 'user@example.com'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role || 'MEMBER'}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Account Details</Text>

      <Card variant="elevated">
        <View style={styles.infoRow}>
          <Ionicons name="finger-print-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.infoLabel}>User ID</Text>
          <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="middle">
            {user?.id || 'N/A'}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.infoLabel}>Member Since</Text>
          <Text style={styles.infoValue}>
            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
          </Text>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Environment & Network</Text>

      <Card variant="flat">
        <View style={styles.infoRow}>
          <Ionicons name="server-outline" size={20} color={Colors.primary} />
          <Text style={styles.infoLabel}>API Base URL</Text>
        </View>
        <Text style={styles.endpointText}>{Config.API_BASE_URL}</Text>
      </Card>

      <Button
        title="Sign Out"
        onPress={handleLogout}
        variant="danger"
        loading={isLoading}
        style={styles.logoutButton}
        icon={<Ionicons name="log-out-outline" size={20} color={Colors.textInverse} />}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  name: {
    ...Typography.h2,
    marginBottom: 2,
  },
  email: {
    ...Typography.caption,
    marginBottom: Spacing.sm,
  },
  roleBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  roleText: {
    ...Typography.small,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  sectionTitle: {
    ...Typography.h3,
    marginTop: Spacing.md,
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
  infoValue: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    maxWidth: 160,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  endpointText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    fontFamily: 'monospace',
  },
  logoutButton: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
});
