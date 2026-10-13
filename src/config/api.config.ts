import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Returns the resolved API Base URL.
 *
 * For Web: default http://localhost:3000
 * For Android emulator: 10.0.2.2:3000
 * For iOS Simulator or physical device on LAN: dynamically detected from expo debugger host or localhost
 */
export function getApiBaseUrl(): string {
  // Check explicit environment variable if provided
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.replace(/\/+$/, '');
  }

  if (Platform.OS === 'web') {
    return 'http://localhost:3000';
  }

  // If running in development with Expo Go / dev client, detect host URI
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:3000`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }

  return 'http://localhost:3000';
}
