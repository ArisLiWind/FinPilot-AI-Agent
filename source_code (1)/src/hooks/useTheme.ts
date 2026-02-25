/**
 * useTheme.ts
 * Returns a color palette object based on current theme (dark/light).
 * Use this hook in any component to get theme-aware colors for inline styles.
 */
import { useAppStore } from '../store/appStore';

export type ThemeColors = typeof darkColors;

export const darkColors = {
  // Backgrounds
  pageBg:      '#0B1E3D',
  pageBg2:     '#020c1e',
  card:        'rgba(15,24,50,0.85)',
  card2:       'rgba(15,24,50,0.6)',
  cardBorder:  'rgba(59,130,246,0.15)',
  accent:      'rgba(29,78,216,0.2)',
  accentBorder:'rgba(59,130,246,0.2)',
  accent2:     'rgba(29,78,216,0.15)',
  glassNav:    'rgba(11,30,61,0.82)',
  glassNavBorder: 'rgba(59,130,246,0.2)',
  // Text
  text:        '#E6F0FF',
  muted:       '#7B8794',
  textInverse: '#0F172A',
  // Theme markers
  isDark: true,
} as const;

export const lightColors = {
  // Backgrounds
  pageBg:      '#EFF6FF',
  pageBg2:     '#DBEAFE',
  card:        'rgba(255,255,255,0.95)',
  card2:       'rgba(255,255,255,0.75)',
  cardBorder:  'rgba(29,78,216,0.18)',
  accent:      'rgba(29,78,216,0.08)',
  accentBorder:'rgba(59,130,246,0.25)',
  accent2:     'rgba(29,78,216,0.06)',
  glassNav:    'rgba(239,246,255,0.94)',
  glassNavBorder: 'rgba(29,78,216,0.18)',
  // Text
  text:        '#0F172A',
  muted:       '#64748B',
  textInverse: '#E6F0FF',
  // Theme markers
  isDark: false,
} as const;

/** Hook: returns the current theme's color palette */
export function useTheme(): ThemeColors {
  const theme = useAppStore((s) => s.theme);
  return theme === 'light' ? (lightColors as unknown as ThemeColors) : darkColors;
}

/** Hook: returns current theme name */
export function useThemeName() {
  return useAppStore((s) => s.theme);
}
