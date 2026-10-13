import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { LinkFlowTheme } from '@/constants/theme';

interface CardProps extends ViewProps {
  elevated?: boolean;
}

export function Card({ elevated = false, style, children, ...props }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        elevated ? styles.elevated : null,
        style,
      ]}
      {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: LinkFlowTheme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LinkFlowTheme.border,
    padding: 16,
  },
  elevated: {
    backgroundColor: LinkFlowTheme.cardElevated,
    shadowColor: LinkFlowTheme.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
});
