/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const LinkFlowTheme = {
  primary: '#35155D',
  secondary: '#512B81',
  background: '#110B19',
  card: '#21152D',
  cardElevated: '#2A1A3B',
  border: '#39264B',
  accent: '#C9A9F4',
  text: '#F8F5FC',
  textSecondary: '#C9B9DD',
  textMuted: '#8D7B9F',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  glow: 'rgba(201, 169, 244, 0.15)',
} as const;

export const Colors = {
  light: {
    text: LinkFlowTheme.text,
    background: LinkFlowTheme.background,
    backgroundElement: LinkFlowTheme.card,
    backgroundSelected: LinkFlowTheme.secondary,
    textSecondary: LinkFlowTheme.textSecondary,
  },
  dark: {
    text: LinkFlowTheme.text,
    background: LinkFlowTheme.background,
    backgroundElement: LinkFlowTheme.card,
    backgroundSelected: LinkFlowTheme.secondary,
    textSecondary: LinkFlowTheme.textSecondary,
  },
} as const;

export type ThemeColor = keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
