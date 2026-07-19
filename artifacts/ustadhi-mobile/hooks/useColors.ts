import colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';

/**
 * Returns the design tokens for the current color scheme, driven by
 * AppContext (which persists the user's light/dark preference in AsyncStorage).
 */
export function useColors() {
  let effectiveTheme: 'light' | 'dark' = 'light';
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    effectiveTheme = useApp().effectiveTheme;
  } catch {
    // fallback if called outside AppProvider
  }
  const palette = effectiveTheme === 'dark' ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
