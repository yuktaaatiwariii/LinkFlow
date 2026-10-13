import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinkFlowTheme } from '@/constants/theme';
import { useAuth } from '@/context/auth.context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface AuthScreenProps {
  onSuccess?: () => void;
}

export function AuthScreen({ onSuccess }: AuthScreenProps) {
  const { login, register } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const clearErrors = () => {
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setGeneralError(null);
  };

  const validate = (): boolean => {
    clearErrors();
    let valid = true;

    if (!email.trim()) {
      setEmailError('Email is required');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Please enter a valid email address');
      valid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      valid = false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      valid = false;
    }

    if (!isLoginMode) {
      if (password !== confirmPassword) {
        setConfirmPasswordError('Passwords do not match');
        valid = false;
      }
    }

    return valid;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    setGeneralError(null);

    try {
      if (isLoginMode) {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password);
      }
      onSuccess?.();
    } catch (err: any) {
      if (err.messages && Array.isArray(err.messages)) {
        setGeneralError(err.messages.join('. '));
      } else {
        setGeneralError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    clearErrors();
    setIsLoginMode((prev) => !prev);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.cardWrapper}>
          <Card elevated style={styles.card}>
            {/* Brand Header */}
            <View style={styles.brandContainer}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoBadgeText}>⚡</Text>
              </View>
              <Text style={styles.brandTitle}>LinkFlow</Text>
              <Text style={styles.brandSubtitle}>
                {isLoginMode
                  ? 'Sign in to access your shortened links & overview'
                  : 'Create an account to begin shortening links'}
              </Text>
            </View>

            {generalError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{generalError}</Text>
              </View>
            ) : null}

            <Input
              label="Email Address"
              placeholder="user@example.com"
              value={email}
              onChangeText={setEmail}
              error={emailError}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />

            <Input
              label="Password"
              placeholder="At least 8 characters"
              value={password}
              onChangeText={setPassword}
              error={passwordError}
              isPassword
              autoCapitalize="none"
              autoCorrect={false}
            />

            {!isLoginMode ? (
              <Input
                label="Confirm Password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                error={confirmPasswordError}
                isPassword
                autoCapitalize="none"
                autoCorrect={false}
              />
            ) : null}

            <View style={styles.submitContainer}>
              <Button
                title={isLoginMode ? 'Sign In' : 'Create Account'}
                onPress={handleSubmit}
                loading={loading}
                variant="primary"
                size="lg"
              />
            </View>

            <View style={styles.footerRow}>
              <Text style={styles.footerPrompt}>
                {isLoginMode
                  ? "Don't have an account yet?"
                  : 'Already have an account?'}
              </Text>
              <Pressable onPress={switchMode} style={styles.switchButton}>
                <Text style={styles.switchText}>
                  {isLoginMode ? 'Create one' : 'Sign In'}
                </Text>
              </Pressable>
            </View>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: LinkFlowTheme.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 440,
  },
  card: {
    padding: 28,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: LinkFlowTheme.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoBadgeText: {
    fontSize: 24,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: LinkFlowTheme.text,
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: LinkFlowTheme.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: LinkFlowTheme.error,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
    textAlign: 'center',
  },
  submitContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  footerPrompt: {
    color: LinkFlowTheme.textSecondary,
    fontSize: 14,
  },
  switchButton: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  switchText: {
    color: LinkFlowTheme.accent,
    fontSize: 14,
    fontWeight: '700',
  },
});
