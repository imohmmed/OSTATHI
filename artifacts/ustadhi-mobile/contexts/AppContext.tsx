import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

type FontScale = 0.9 | 1 | 1.15;
type ThemeMode = 'system' | 'light' | 'dark';

interface AppContextType {
  fontScale: FontScale;
  setFontScale: (scale: FontScale) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  effectiveTheme: 'light' | 'dark';
}

const AppContext = createContext<AppContextType>({
  fontScale: 1,
  setFontScale: () => {},
  themeMode: 'system',
  setThemeMode: () => {},
  effectiveTheme: 'light',
});

const FS_KEY = '@ustadhi_font_scale';
const TM_KEY = '@ustadhi_theme_mode';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [fontScale, setFontScaleState] = useState<FontScale>(1);
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const systemScheme = useColorScheme();

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(FS_KEY),
      AsyncStorage.getItem(TM_KEY),
    ]).then(([fs, tm]) => {
      if (fs) setFontScaleState(parseFloat(fs) as FontScale);
      if (tm) setThemeModeState(tm as ThemeMode);
    });
  }, []);

  const setFontScale = (s: FontScale) => {
    setFontScaleState(s);
    AsyncStorage.setItem(FS_KEY, String(s));
  };

  const setThemeMode = (m: ThemeMode) => {
    setThemeModeState(m);
    AsyncStorage.setItem(TM_KEY, m);
  };

  const effectiveTheme: 'light' | 'dark' =
    themeMode === 'system' ? (systemScheme ?? 'light') : themeMode;

  return (
    <AppContext.Provider value={{ fontScale, setFontScale, themeMode, setThemeMode, effectiveTheme }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
