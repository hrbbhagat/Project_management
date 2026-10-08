import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/colors';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';
import { Button, Input, ScreenContainer, Card } from '../../components/common';
import { isValidEmail, isValidPassword } from '../../utils/validation';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { login, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!isValidEmail(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (!isValidPassword(password)) {
      errors.password = 'Password must be at least 8 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async () => {
    clearError();
    if (!validate()) return;

    try {
      await login({ email: email.trim(), password });
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Please check your credentials.');
    }
  };

  return (
    <ScreenContainer scrollable contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Ionicons name="layers" size={36} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Welcome to Taskline</Text>
        <Text style={styles.subtitle}>Sign in to manage your projects and tasks</Text>
      </View>

      <Card variant="elevated" style={styles.card}>
        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color={Colors.danger} />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        <Input
          label="Email Address"
          placeholder="name@example.com"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          error={fieldErrors.email}
          leftIcon={<Ionicons name="mail-outline" size={20} color={Colors.textSecondary} />}
        />

        <Input
          label="Password"
          placeholder="••••••••"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
          }}
          isPassword
          error={fieldErrors.password}
          leftIcon={<Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} />}
        />

        <Button
          title="Sign In"
          onPress={handleLogin}
          loading={isLoading}
          style={styles.signInButton}
        />

        <View style={styles.registerRow}>
          <Text style={styles.registerPrompt}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </Card>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h1,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.caption,
    textAlign: 'center',
  },
  card: {
    padding: Spacing.lg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    padding: Spacing.sm + 2,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  errorBannerText: {
    ...Typography.small,
    color: Colors.danger,
    marginLeft: Spacing.xs,
    flex: 1,
  },
  signInButton: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerPrompt: {
    ...Typography.caption,
  },
  registerLink: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
  },
});
