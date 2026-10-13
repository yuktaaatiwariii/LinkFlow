import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { LinkFlowTheme } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  isPassword?: boolean;
}

export function Input({
  label,
  error,
  isPassword = false,
  style,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(!isPassword);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.focusedWrapper,
          error ? styles.errorWrapper : null,
        ]}>
        <TextInput
          placeholderTextColor={LinkFlowTheme.textMuted}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[styles.input, style]}
          {...props}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setShowPassword((prev) => !prev)}
            style={styles.eyeButton}>
            <Text style={styles.eyeText}>
              {showPassword ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    color: LinkFlowTheme.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LinkFlowTheme.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: LinkFlowTheme.border,
    paddingHorizontal: 14,
  },
  focusedWrapper: {
    borderColor: LinkFlowTheme.accent,
    backgroundColor: LinkFlowTheme.cardElevated,
  },
  errorWrapper: {
    borderColor: LinkFlowTheme.error,
  },
  input: {
    flex: 1,
    color: LinkFlowTheme.text,
    fontSize: 15,
    paddingVertical: 12,
  },
  eyeButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  eyeText: {
    color: LinkFlowTheme.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    color: LinkFlowTheme.error,
    fontSize: 12,
    marginTop: 4,
  },
});
