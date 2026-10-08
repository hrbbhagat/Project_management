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

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { register, isLoading, error, clearError } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const validate = () => {
    const errors: {
      fullName?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!fullName.trim()) {
      errors.fullName = 'Full name is required';
    }

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

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    clearError();
    if (!validate()) return;

    try {
      await register({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
      });
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Please check your inputs.');
    }
  };

  return (
    <ScreenContainer scrollable contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Ionicons name="person-add" size={32} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Get started with collaborative project tracking</Text>
      </View>

      <Card variant="elevated" style={styles.card}>
        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color={Colors.danger} />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        <Input
          label="Full Name"
          placeholder="Jane Doe"
          value={fullName}
          onChangeText={(text) => {
            setFullName(text);
            if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
          }}
          autoCapitalize="words"
          error={fieldErrors.fullName}
          leftIcon={<Ionicons name="person-outline" size={20} color={Colors.textSecondary} />}
        />

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
          placeholder="At least 8 characters"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
          }}
          isPassword
          error={fieldErrors.password}
          leftIcon={<Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} />}
        />

        <Input
          label="Confirm Password"
          placeholder="Re-enter password"
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            if (fieldErrors.confirmPassword)
              setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
          }}
          isPassword
          error={fieldErrors.confirmPassword}
          leftIcon={<Ionicons name="shield-checkmark-outline" size={20} color={Colors.textSecondary} />}
        />

        <Button
          title="Create Account"
          onPress={handleRegister}
          loading={isLoading}
          style={styles.registerButton}
        />

        <View style={styles.loginRow}>
          <Text style={styles.loginPrompt}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Sign In</Text>
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
    marginBottom: Spacing.lg,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.h2,
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
  registerButton: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginPrompt: {
    ...Typography.caption,
  },
  loginLink: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
  },
});
