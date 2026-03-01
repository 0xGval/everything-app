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

interface WidgetInstanceMeta {
  id: string;
  widgetType: string;
}

const DEFAULT_WIDGETS: WidgetInstanceMeta[] = [
  { id: 'sender-1', widgetType: 'event-sender' },
  { id: 'receiver-1', widgetType: 'event-receiver' },
  { id: 'writer-1', widgetType: 'counter-writer' },
  { id: 'reader-1', widgetType: 'counter-reader' },
];

const DEFAULT_LAYOUT: LayoutItem[] = [
  { i: 'sender-1', x: 0, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
  { i: 'receiver-1', x: 3, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
  { i: 'writer-1', x: 6, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
  { i: 'reader-1', x: 9, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
];

interface LayoutState {
  layout: LayoutItem[];
  widgets: WidgetInstanceMeta[];
  loaded: boolean;
  loadLayout: (dashboardId: string) => Promise<void>;
  updateLayout: (layout: LayoutItem[]) => void;
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function debouncedSave(
  layout: LayoutItem[],
  widgets: WidgetInstanceMeta[],
  dashboardId: string,
): void {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    for (const item of layout) {
      const widget = widgets.find((w) => w.id === item.i);
      const position = JSON.stringify({ x: item.x, y: item.y, w: item.w, h: item.h });
      invoke('save_widget_instance', {
        input: {
          id: item.i,
          widgetType: widget?.widgetType ?? 'unknown',
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

        const widgets: WidgetInstanceMeta[] = instances.map((inst) => ({
          id: inst.id,
          widgetType: inst.widgetType,
        }));

        set({ layout, widgets, loaded: true });
      }
    } catch (e) {
      console.error('loadLayout failed:', e);
      set({ layout: DEFAULT_LAYOUT, widgets: DEFAULT_WIDGETS, loaded: true });
    }
  },

  updateLayout: (layout: LayoutItem[]) => {
    const { widgets } = useLayoutStore.getState();
    set({ layout });
    debouncedSave(layout, widgets, 'default');
  },
}));
