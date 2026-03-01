import { invoke } from '@tauri-apps/api/core';
import type { WidgetContext } from './types';
import { eventBus } from './event-bus';
import { readSharedState, writeSharedState, subscribeSharedState } from '@/lib/store/shared-state';
import { getSettingSync, getSettingsSync, setSetting } from './settings-cache';

interface WidgetDataRow {
  id: string;
  widgetInstanceId: string;
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export function createWidgetContext(widgetInstanceId: string): WidgetContext {
  return {
    widgetId: widgetInstanceId,

    emit: (event, payload) => {
      eventBus.emit(event, payload, widgetInstanceId);
    },

    on: (event, callback) => {
      return eventBus.on(event, callback);
    },

    db: {
      get: async (key) => {
        const rows = await invoke<WidgetDataRow[]>('get_widget_data', {
          widgetInstanceId,
        });
        const row = rows.find((r) => r.key === key);
        if (!row) return undefined;
        try {
          return JSON.parse(row.value);
        } catch {
          return row.value;
        }
      },

      set: async (key, value) => {
        await invoke('save_widget_data', {
          input: {
            id: `${widgetInstanceId}:${key}`,
            widgetInstanceId,
            key,
            value: JSON.stringify(value),
          },
        });
      },

      query: async (_table, _filter) => {
        console.log(`[widget:${widgetInstanceId}] db.query stub`, _table, _filter);
        return [];
      },

      delete: async (key) => {
        console.log(`[widget:${widgetInstanceId}] db.delete stub`, key);
      },
    },

    sharedState: {
      read: (namespace) => {
        return readSharedState(namespace);
      },
      write: (namespace, value) => {
        writeSharedState(namespace, value);
      },
      subscribe: (namespace, callback) => {
        return subscribeSharedState(namespace, callback);
      },
    },

    settings: {
      get: (key) => {
        return getSettingSync(widgetInstanceId, key);
      },
      set: async (key, value) => {
        await setSetting(widgetInstanceId, key, value);
      },
      getAll: () => {
        return getSettingsSync(widgetInstanceId);
      },
    },

    notify: (title, body) => {
      console.log(`[widget:${widgetInstanceId}] notify stub`, title, body);
    },

    invoke: (command, args) => {
      return invoke(command, args as Record<string, unknown>);
    },
  };
}
