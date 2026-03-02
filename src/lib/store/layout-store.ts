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

const DEFAULT_WIDGETS: WidgetInstanceMeta[] = [];

const DEFAULT_LAYOUT: LayoutItem[] = [];

interface ExpandedWidget {
  instanceId: string;
  widgetType: string;
}

interface LayoutState {
  layout: LayoutItem[];
  widgets: WidgetInstanceMeta[];
  loaded: boolean;
  activeDashboardId: string;
  expandedWidget: ExpandedWidget | null;
  loadLayout: (dashboardId: string) => Promise<void>;
  updateLayout: (layout: LayoutItem[]) => void;
  addWidget: (widgetType: string, gridDefaults: { w: number; h: number; minW: number; minH: number }) => Promise<void>;
  removeWidget: (widgetInstanceId: string) => Promise<void>;
  expandWidget: (instanceId: string, widgetType: string) => void;
  collapseWidget: () => void;
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
  widgets: [],
  loaded: false,
  activeDashboardId: '',
  expandedWidget: null,

  loadLayout: async (dashboardId: string) => {
    // Reset state while loading
    set({ loaded: false, activeDashboardId: dashboardId });

    try {
      const instances = await invoke<WidgetInstanceFromDB[]>('get_widget_instances', {
        dashboardId,
      });

      if (instances.length === 0 && dashboardId === 'default') {
        // First launch on the default dashboard: seed defaults
        for (const item of DEFAULT_LAYOUT) {
          const widget = DEFAULT_WIDGETS.find((w) => w.id === item.i);
          const position = JSON.stringify({ x: item.x, y: item.y, w: item.w, h: item.h });
          await invoke('save_widget_instance', {
            input: {
              id: item.i,
              widgetType: widget?.widgetType ?? 'unknown',
              dashboardId,
              gridPosition: position,
              settings: '{}',
            },
          });
        }
        set({ layout: DEFAULT_LAYOUT, widgets: DEFAULT_WIDGETS, loaded: true });
      } else {
        // Restore from DB (may be empty for new dashboards)
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
      set({ layout: [], widgets: [], loaded: true });
    }
  },

  updateLayout: (layout: LayoutItem[]) => {
    const { widgets, activeDashboardId } = useLayoutStore.getState();
    set({ layout });
    debouncedSave(layout, widgets, activeDashboardId);
  },

  addWidget: async (widgetType, gridDefaults) => {
    const { layout, widgets, activeDashboardId } = useLayoutStore.getState();
    const id = `${widgetType}-${Date.now()}`;
    const position = { x: 0, y: Infinity, w: gridDefaults.w, h: gridDefaults.h };

    await invoke('save_widget_instance', {
      input: {
        id,
        widgetType,
        dashboardId: activeDashboardId,
        gridPosition: JSON.stringify(position),
        settings: '{}',
      },
    });

    const newLayout: LayoutItem[] = [
      ...layout,
      { i: id, ...position, minW: gridDefaults.minW, minH: gridDefaults.minH },
    ];
    const newWidgets: WidgetInstanceMeta[] = [...widgets, { id, widgetType }];
    set({ layout: newLayout, widgets: newWidgets });
  },

  removeWidget: async (widgetInstanceId) => {
    await invoke('delete_widget_instance', { widgetInstanceId });
    set((s) => ({
      layout: s.layout.filter((item) => item.i !== widgetInstanceId),
      widgets: s.widgets.filter((w) => w.id !== widgetInstanceId),
    }));
  },

  expandWidget: (instanceId, widgetType) => {
    set({ expandedWidget: { instanceId, widgetType } });
  },

  collapseWidget: () => {
    set({ expandedWidget: null });
  },
}));
