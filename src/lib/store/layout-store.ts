import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { LayoutItem } from 'react-grid-layout';

interface WidgetInstanceFromDB {
  id: string;
  widgetType: string;
  dashboardId: string;
  gridPosition: string;
  settings: string;
  createdAt: string;
  updatedAt: string;
}

interface PlaceholderMeta {
  id: string;
  widgetType: string;
  title: string;
  color: string;
}

const DEFAULT_WIDGETS: PlaceholderMeta[] = [
  { id: 'a', widgetType: 'placeholder', title: 'Widget A', color: 'bg-blue-500/20 text-blue-400' },
  {
    id: 'b',
    widgetType: 'placeholder',
    title: 'Widget B',
    color: 'bg-emerald-500/20 text-emerald-400',
  },
  {
    id: 'c',
    widgetType: 'placeholder',
    title: 'Widget C',
    color: 'bg-amber-500/20 text-amber-400',
  },
];

const DEFAULT_LAYOUT: LayoutItem[] = [
  { i: 'a', x: 0, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
  { i: 'b', x: 4, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
  { i: 'c', x: 8, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
];

interface LayoutState {
  layout: LayoutItem[];
  widgets: PlaceholderMeta[];
  loaded: boolean;
  loadLayout: (dashboardId: string) => Promise<void>;
  updateLayout: (layout: LayoutItem[]) => void;
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function debouncedSave(layout: LayoutItem[], dashboardId: string): void {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    for (const item of layout) {
      const position = JSON.stringify({ x: item.x, y: item.y, w: item.w, h: item.h });
      invoke('save_widget_instance', {
        input: {
          id: item.i,
          widgetType: 'placeholder',
          dashboardId,
          gridPosition: position,
          settings: '{}',
        },
      }).catch((e) => console.error('save_widget_instance failed:', e));
    }
  }, 500);
}

export const useLayoutStore = create<LayoutState>((set) => ({
  layout: [],
  widgets: DEFAULT_WIDGETS,
  loaded: false,

  loadLayout: async (dashboardId: string) => {
    try {
      const instances = await invoke<WidgetInstanceFromDB[]>('get_widget_instances', {
        dashboardId,
      });

      if (instances.length === 0) {
        // First launch: seed defaults to DB and use default layout
        for (const item of DEFAULT_LAYOUT) {
          const widget = DEFAULT_WIDGETS.find((w) => w.id === item.i);
          const position = JSON.stringify({ x: item.x, y: item.y, w: item.w, h: item.h });
          await invoke('save_widget_instance', {
            input: {
              id: item.i,
              widgetType: widget?.widgetType ?? 'placeholder',
              dashboardId,
              gridPosition: position,
              settings: '{}',
            },
          });
        }
        set({ layout: DEFAULT_LAYOUT, widgets: DEFAULT_WIDGETS, loaded: true });
      } else {
        // Restore from DB
        const layout: LayoutItem[] = instances.map((inst) => {
          const pos = JSON.parse(inst.gridPosition) as {
            x: number;
            y: number;
            w: number;
            h: number;
          };
          return { i: inst.id, ...pos, minW: 2, minH: 2 };
        });

        const widgets: PlaceholderMeta[] = instances.map((inst) => {
          const existing = DEFAULT_WIDGETS.find((w) => w.id === inst.id);
          return (
            existing ?? {
              id: inst.id,
              widgetType: inst.widgetType,
              title: inst.id,
              color: 'bg-muted text-muted-foreground',
            }
          );
        });

        set({ layout, widgets, loaded: true });
      }
    } catch (e) {
      console.error('loadLayout failed:', e);
      set({ layout: DEFAULT_LAYOUT, widgets: DEFAULT_WIDGETS, loaded: true });
    }
  },

  updateLayout: (layout: LayoutItem[]) => {
    set({ layout });
    debouncedSave(layout, 'default');
  },
}));
