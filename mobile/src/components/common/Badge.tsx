import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { BorderRadius, Spacing, Typography } from '../../constants/theme';
import { formatStatus } from '../../utils/formatters';

interface BadgeProps {
  label: string;
  variant?: 'status' | 'priority' | 'default';
  type?: string;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  type,
  style,
}) => {
  let color = Colors.primary;
  let bg = Colors.primaryLight;

  if (variant === 'status' || type) {
    const key = (type || label).toUpperCase() as keyof typeof Colors.status;
    color = Colors.status[key] || Colors.primary;
    bg = `${color}18`; // 10% opacity tint
  } else if (variant === 'priority') {
    const key = label.toUpperCase() as keyof typeof Colors.priority;
    color = Colors.priority[key] || Colors.warning;
    bg = `${color}18`;
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: `${color}40` }, style]}>
      <Text style={[styles.text, { color }]}>{formatStatus(label)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  text: {
    ...Typography.small,
    fontWeight: '700',
    fontSize: 11,
  },
});
