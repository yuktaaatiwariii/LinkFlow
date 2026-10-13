import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { LinkFlowTheme } from '@/constants/theme';
import { useAuth } from '@/context/auth.context';
import { AuthScreen } from '@/components/auth-screen';
import Dashboard from '@/components/dashboard';

export default function IndexScreen() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={LinkFlowTheme.accent} />
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return <AuthScreen />;
  }

  return <Dashboard />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: LinkFlowTheme.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
