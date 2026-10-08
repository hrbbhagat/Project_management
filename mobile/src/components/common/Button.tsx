import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { BorderRadius, Spacing, Typography } from '../../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const getContainerStyle = (): ViewStyle => {
    let base: ViewStyle = styles.base;

    // Size
    if (size === 'sm') base = { ...base, paddingVertical: 8, paddingHorizontal: 12 };
    if (size === 'md') base = { ...base, paddingVertical: 14, paddingHorizontal: 20 };
    if (size === 'lg') base = { ...base, paddingVertical: 18, paddingHorizontal: 24 };

    // Variant
    switch (variant) {
      case 'secondary':
        base = { ...base, backgroundColor: Colors.surfaceSubtle, borderWidth: 1, borderColor: Colors.border };
        break;
      case 'outline':
        base = { ...base, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.primary };
        break;
      case 'danger':
        base = { ...base, backgroundColor: Colors.danger };
        break;
      case 'ghost':
        base = { ...base, backgroundColor: 'transparent' };
        break;
      case 'primary':
      default:
        base = { ...base, backgroundColor: Colors.primary };
        break;
    }

    if (disabled || loading) {
      base = { ...base, opacity: 0.6 };
    }

    return base;
  };

  const getTextStyle = (): TextStyle => {
    let base: TextStyle = { ...Typography.bodyMedium, fontWeight: '600' };

    switch (variant) {
      case 'secondary':
        base = { ...base, color: Colors.textPrimary };
        break;
      case 'outline':
        base = { ...base, color: Colors.primary };
        break;
      case 'ghost':
        base = { ...base, color: Colors.textSecondary };
        break;
      case 'danger':
      case 'primary':
      default:
        base = { ...base, color: Colors.textInverse };
        break;
    }

    if (size === 'sm') base = { ...base, fontSize: 13 };
    if (size === 'lg') base = { ...base, fontSize: 17 };

    return base;
  };

  return (
    <TouchableOpacity
      style={[getContainerStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'secondary' || variant === 'ghost' ? Colors.primary : Colors.textInverse}
        />
      ) : (
        <>
          {icon}
          <Text style={[getTextStyle(), icon ? { marginLeft: Spacing.sm } : null, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
