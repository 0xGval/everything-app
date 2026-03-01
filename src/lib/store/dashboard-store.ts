import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

interface Dashboard {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
  createdAt: string;
}

interface DashboardState {
  dashboards: Dashboard[];
  activeId: string;
  loaded: boolean;
  load: () => Promise<void>;
  setActive: (id: string) => void;
  create: (name: string, icon: string) => Promise<Dashboard>;
  rename: (id: string, name: string, icon: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  dashboards: [],
  activeId: '',
  loaded: false,

  load: async () => {
    const dashboards = await invoke<Dashboard[]>('get_dashboards');
    const activeId = dashboards.length > 0 ? dashboards[0].id : '';
    set({ dashboards, activeId, loaded: true });
  },

  setActive: (id) => {
    set({ activeId: id });
  },

  create: async (name, icon) => {
    const { dashboards } = get();
    const id = `dash-${Date.now()}`;
    const sortOrder = dashboards.length;
    const dashboard = await invoke<Dashboard>('create_dashboard', {
      input: { id, name, icon, sortOrder },
    });
    set((s) => ({ dashboards: [...s.dashboards, dashboard] }));
    return dashboard;
  },

  rename: async (id, name, icon) => {
    const updated = await invoke<Dashboard>('rename_dashboard', { id, name, icon });
    set((s) => ({
      dashboards: s.dashboards.map((d) => (d.id === id ? updated : d)),
    }));
  },

  remove: async (id) => {
    const { dashboards, activeId } = get();
    if (dashboards.length <= 1) return;
    await invoke('delete_dashboard', { id });
    const remaining = dashboards.filter((d) => d.id !== id);
    const newActiveId = activeId === id ? remaining[0].id : activeId;
    set({ dashboards: remaining, activeId: newActiveId });
  },
}));
