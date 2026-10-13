import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'linkflow_auth_token';

/**
 * Universal secure token storage.
 * Uses expo-secure-store on native platforms (iOS/Android)
 * and localStorage on web.
 */
export async function saveAuthToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Ignore web storage errors
    }
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
}

export async function getAuthToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  } else {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  }
}

export async function deleteAuthToken(): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Ignore web storage errors
    }
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}
