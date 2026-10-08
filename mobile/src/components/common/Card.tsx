import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { BorderRadius, Shadows, Spacing } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'elevated' | 'outlined' | 'flat';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  variant = 'elevated',
}) => {
  const getCardStyle = (): ViewStyle => {
    let base: ViewStyle = styles.base;

    switch (variant) {
      case 'outlined':
        base = { ...base, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface };
        break;
      case 'flat':
        base = { ...base, backgroundColor: Colors.surfaceSubtle };
        break;
      case 'elevated':
      default:
        base = { ...base, ...Shadows.sm, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border };
        break;
    }

    return base;
  };

  if (onPress) {
    return (
      <TouchableOpacity
        style={[getCardStyle(), style]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[getCardStyle(), style]}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
});
