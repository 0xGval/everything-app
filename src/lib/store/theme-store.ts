import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  loaded: boolean;
  load: () => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
}

const SETTINGS_KEY = 'theme';

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'dark',
  loaded: false,

  load: async () => {
    try {
      const raw = await invoke<{ key: string; value: string } | null>('get_app_setting', {
        key: SETTINGS_KEY,
      });
      const theme = (raw ? JSON.parse(raw.value) : 'dark') as Theme;
      applyTheme(theme);
      set({ theme, loaded: true });
    } catch {
      applyTheme('dark');
      set({ loaded: true });
    }
  },

  setTheme: async (theme) => {
    applyTheme(theme);
    set({ theme });
    await invoke('save_app_setting', {
      key: SETTINGS_KEY,
      value: JSON.stringify(theme),
    });
  },
}));

// Listen for system theme changes when in "system" mode
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { theme } = useThemeStore.getState();
    if (theme === 'system') {
      applyTheme('system');
    }
  });
}
