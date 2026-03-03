import { invoke } from '@tauri-apps/api/core';
import type { WidgetContext } from './types';
import { eventBus } from './event-bus';
import { readSharedState, writeSharedState, subscribeSharedState } from '@/lib/store/shared-state';
import { getSettingSync, getSettingsSync, setSetting } from './settings-cache';
import { notify as sendNativeNotification } from './notifications';

interface WidgetDataRow {
  id: string;
  widgetInstanceId: string;
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

// Per-widget data cache — avoids repeated DB calls for the same widget
const dataCache = new Map<string, Map<string, unknown>>();
const dataCachePromises = new Map<string, Promise<void>>();

async function ensureCacheLoaded(widgetInstanceId: string): Promise<Map<string, unknown>> {
  if (!dataCachePromises.has(widgetInstanceId)) {
    dataCachePromises.set(
      widgetInstanceId,
      (async () => {
        const rows = await invoke<WidgetDataRow[]>('get_widget_data', { widgetInstanceId });
        const cache = new Map<string, unknown>();
        for (const row of rows) {
          try {
            cache.set(row.key, JSON.parse(row.value));
          } catch {
            cache.set(row.key, row.value);
          }
        }
        dataCache.set(widgetInstanceId, cache);
      })(),
    );
  }
  await dataCachePromises.get(widgetInstanceId);
  return dataCache.get(widgetInstanceId)!;
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
        const cache = await ensureCacheLoaded(widgetInstanceId);
        return cache.get(key);
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
        // Update cache
        const cache = dataCache.get(widgetInstanceId);
        if (cache) cache.set(key, value);
      },

      query: async (_table, _filter) => {
        console.log(`[widget:${widgetInstanceId}] db.query stub`, _table, _filter);
        return [];
      },

      delete: async (key) => {
        await invoke('delete_widget_data', { widgetInstanceId, key });
        // Update cache
        const cache = dataCache.get(widgetInstanceId);
        if (cache) cache.delete(key);
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
      sendNativeNotification(title, body);
    },

    invoke: (command, args) => {
      return invoke(command, args as Record<string, unknown>);
    },
  };
}
