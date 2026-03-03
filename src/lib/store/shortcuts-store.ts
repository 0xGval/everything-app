import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

interface ShortcutDef {
  id: string;
  label: string;
  group: string;
  defaultBinding: string;
  binding: string;
}

interface ShortcutsState {
  shortcuts: ShortcutDef[];
  loaded: boolean;
  load: () => Promise<void>;
  rebind: (id: string, newBinding: string) => Promise<void>;
  reset: (id: string) => Promise<void>;
  resetAll: () => Promise<void>;
  getBinding: (id: string) => string;
}

const DEFAULT_SHORTCUTS: Omit<ShortcutDef, 'binding'>[] = [
  { id: 'command-palette', label: 'Command Palette', group: 'General', defaultBinding: 'Ctrl+K' },
  { id: 'command-palette-slash', label: 'Command Palette (slash)', group: 'General', defaultBinding: '/' },
  { id: 'add-widget', label: 'Add Widget', group: 'General', defaultBinding: 'Ctrl+N' },
  { id: 'settings', label: 'Open Settings', group: 'General', defaultBinding: 'Ctrl+,' },
  { id: 'toggle-sidebar', label: 'Toggle Sidebar', group: 'General', defaultBinding: 'Ctrl+L' },
  { id: 'close-panel', label: 'Close Panel / Collapse', group: 'General', defaultBinding: 'Escape' },
  { id: 'dashboard-1', label: 'Dashboard 1', group: 'Dashboards', defaultBinding: 'Ctrl+1' },
  { id: 'dashboard-2', label: 'Dashboard 2', group: 'Dashboards', defaultBinding: 'Ctrl+2' },
  { id: 'dashboard-3', label: 'Dashboard 3', group: 'Dashboards', defaultBinding: 'Ctrl+3' },
  { id: 'dashboard-4', label: 'Dashboard 4', group: 'Dashboards', defaultBinding: 'Ctrl+4' },
  { id: 'dashboard-5', label: 'Dashboard 5', group: 'Dashboards', defaultBinding: 'Ctrl+5' },
  { id: 'dashboard-6', label: 'Dashboard 6', group: 'Dashboards', defaultBinding: 'Ctrl+6' },
  { id: 'dashboard-7', label: 'Dashboard 7', group: 'Dashboards', defaultBinding: 'Ctrl+7' },
  { id: 'dashboard-8', label: 'Dashboard 8', group: 'Dashboards', defaultBinding: 'Ctrl+8' },
  { id: 'dashboard-9', label: 'Dashboard 9', group: 'Dashboards', defaultBinding: 'Ctrl+9' },
];

const SETTINGS_KEY = 'keyboard_shortcuts';

export const useShortcutsStore = create<ShortcutsState>((set, get) => ({
  shortcuts: DEFAULT_SHORTCUTS.map((s) => ({ ...s, binding: s.defaultBinding })),
  loaded: false,

  load: async () => {
    try {
      const raw = await invoke<{ key: string; value: string } | null>('get_app_setting', {
        key: SETTINGS_KEY,
      });
      if (raw) {
        const customBindings = JSON.parse(raw.value) as Record<string, string>;
        const shortcuts = DEFAULT_SHORTCUTS.map((s) => ({
          ...s,
          binding: customBindings[s.id] ?? s.defaultBinding,
        }));
        set({ shortcuts, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  rebind: async (id, newBinding) => {
    const { shortcuts } = get();
    const updated = shortcuts.map((s) => (s.id === id ? { ...s, binding: newBinding } : s));
    set({ shortcuts: updated });
    await persistBindings(updated);
  },

  reset: async (id) => {
    const { shortcuts } = get();
    const def = DEFAULT_SHORTCUTS.find((s) => s.id === id);
    if (!def) return;
    const updated = shortcuts.map((s) => (s.id === id ? { ...s, binding: def.defaultBinding } : s));
    set({ shortcuts: updated });
    await persistBindings(updated);
  },

  resetAll: async () => {
    const shortcuts = DEFAULT_SHORTCUTS.map((s) => ({ ...s, binding: s.defaultBinding }));
    set({ shortcuts });
    await persistBindings(shortcuts);
  },

  getBinding: (id) => {
    const s = get().shortcuts.find((s) => s.id === id);
    return s?.binding ?? '';
  },
}));

async function persistBindings(shortcuts: ShortcutDef[]): Promise<void> {
  const customBindings: Record<string, string> = {};
  for (const s of shortcuts) {
    if (s.binding !== s.defaultBinding) {
      customBindings[s.id] = s.binding;
    }
  }
  await invoke('save_app_setting', {
    key: SETTINGS_KEY,
    value: JSON.stringify(customBindings),
  });
}

/** Check if a keyboard event matches a binding string like "Ctrl+K" or "/" */
export function matchesBinding(e: KeyboardEvent, binding: string): boolean {
  if (binding === '/') {
    return e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey;
  }

  const parts = binding.split('+').map((p) => p.trim().toLowerCase());
  const needCtrl = parts.includes('ctrl');
  const needShift = parts.includes('shift');
  const needAlt = parts.includes('alt');
  const key = parts.filter((p) => p !== 'ctrl' && p !== 'shift' && p !== 'alt')[0] ?? '';

  if (needCtrl !== (e.ctrlKey || e.metaKey)) return false;
  if (needShift !== e.shiftKey) return false;
  if (needAlt !== e.altKey) return false;

  return e.key.toLowerCase() === key || e.code.toLowerCase() === `key${key}`;
}
