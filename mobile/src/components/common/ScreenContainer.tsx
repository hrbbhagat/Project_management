import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ViewStyle,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  scrollable = true,
  style,
  contentContainerStyle,
  refreshing = false,
  onRefresh,
  header,
  footer,
}) => {
  return (
    <SafeAreaView style={[styles.safeArea, style]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {header}

        {scrollable ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={Colors.primary}
                  colors={[Colors.primary]}
                />
              ) : undefined
            }
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.fixedContainer, contentContainerStyle]}>{children}</View>
        )}

        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.md,
    flexGrow: 1,
  },
  fixedContainer: {
    flex: 1,
    padding: Spacing.md,
  },
});
