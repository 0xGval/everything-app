import { invoke } from '@tauri-apps/api/core';
import type { UnsubscribeFn } from './types';

type EventCallback = (payload: unknown) => void;

class EventBus {
  private listeners = new Map<string, Set<EventCallback>>();

  emit(event: string, payload?: unknown, sourceWidgetId?: string): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const cb of callbacks) {
        try {
          cb(payload);
        } catch (err) {
          console.error(`[event-bus] error in listener for "${event}":`, err);
        }
      }
    }

    // Log to SQLite (fire-and-forget)
    invoke('log_event', {
      eventName: event,
      payload: JSON.stringify(payload ?? {}),
      sourceWidgetId: sourceWidgetId ?? null,
    }).catch((err) => console.error('[event-bus] log_event failed:', err));
  }

  on(event: string, callback: EventCallback): UnsubscribeFn {
    let callbacks = this.listeners.get(event);
    if (!callbacks) {
      callbacks = new Set();
      this.listeners.set(event, callbacks);
    }
    callbacks.add(callback);

    return () => {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    };
  }
}

export const eventBus = new EventBus();
