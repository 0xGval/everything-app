import { invoke } from '@tauri-apps/api/core';

const cache = new Map<string, Record<string, unknown>>();
const listeners = new Map<string, Set<() => void>>();

export async function loadSettings(widgetInstanceId: string): Promise<Record<string, unknown>> {
  try {
    const json = await invoke<string>('get_widget_settings', { widgetInstanceId });
    const parsed = JSON.parse(json) as Record<string, unknown>;
    cache.set(widgetInstanceId, parsed);
    return parsed;
  } catch {
    cache.set(widgetInstanceId, {});
    return {};
  }
}

export function getSettingsSync(widgetInstanceId: string): Record<string, unknown> {
  return cache.get(widgetInstanceId) ?? {};
}

export function getSettingSync(widgetInstanceId: string, key: string): unknown {
  const settings = cache.get(widgetInstanceId);
  return settings?.[key];
}

export async function setSetting(
  widgetInstanceId: string,
  key: string,
  value: unknown,
): Promise<void> {
  const current = cache.get(widgetInstanceId) ?? {};
  const updated = { ...current, [key]: value };
  cache.set(widgetInstanceId, updated);
  await invoke('update_widget_settings', {
    widgetInstanceId,
    settings: JSON.stringify(updated),
  });
  notifyListeners(widgetInstanceId);
}

export async function setAllSettings(
  widgetInstanceId: string,
  settings: Record<string, unknown>,
): Promise<void> {
  cache.set(widgetInstanceId, settings);
  await invoke('update_widget_settings', {
    widgetInstanceId,
    settings: JSON.stringify(settings),
  });
  notifyListeners(widgetInstanceId);
}

export function onSettingsChange(widgetInstanceId: string, callback: () => void): () => void {
  let set = listeners.get(widgetInstanceId);
  if (!set) {
    set = new Set();
    listeners.set(widgetInstanceId, set);
  }
  set.add(callback);
  return () => {
    set.delete(callback);
    if (set.size === 0) listeners.delete(widgetInstanceId);
  };
}

function notifyListeners(widgetInstanceId: string): void {
  const set = listeners.get(widgetInstanceId);
  if (set) {
    for (const cb of set) cb();
  }
}
