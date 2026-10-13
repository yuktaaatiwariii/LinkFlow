import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinkFlowTheme } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
}: ButtonProps) {
  const getBackgroundColor = () => {
    if (disabled) return '#261C33';
    switch (variant) {
      case 'primary':
        return LinkFlowTheme.primary;
      case 'secondary':
        return LinkFlowTheme.secondary;
      case 'outline':
      case 'ghost':
        return 'transparent';
      case 'danger':
        return '#7F1D1D';
      default:
        return LinkFlowTheme.primary;
    }
  };

  const getBorderColor = () => {
    if (variant === 'outline') {
      return disabled ? '#39264B' : LinkFlowTheme.accent;
    }
    return 'transparent';
  };

  const getTextColor = () => {
    if (disabled) return LinkFlowTheme.textMuted;
    if (variant === 'outline') return LinkFlowTheme.accent;
    if (variant === 'ghost') return LinkFlowTheme.textSecondary;
    return LinkFlowTheme.text;
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        styles[size],
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' ? 1.5 : 0,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={LinkFlowTheme.text} />
      ) : (
        <View style={styles.contentRow}>
          {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
          <Text style={[styles.text, { color: getTextColor() }, styles[`text_${size}`]]}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  sm: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  md: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  lg: {
    paddingVertical: 16,
    paddingHorizontal: 26,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  text_sm: {
    fontSize: 13,
  },
  text_md: {
    fontSize: 15,
  },
  text_lg: {
    fontSize: 17,
  },
});
