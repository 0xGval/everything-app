import { invoke } from '@tauri-apps/api/core';
import type { UnsubscribeFn } from './types';

type EventCallback = (payload: unknown) => void;

const MAX_LISTENERS_PER_EVENT = 20;
const DEBOUNCE_EVENTS = new Set(['task:completed', 'craving:resisted']);
const DEBOUNCE_MS = 100;

class EventBus {
  private listeners = new Map<string, Set<EventCallback>>();
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  emit(event: string, payload?: unknown, sourceWidgetId?: string): void {
    if (DEBOUNCE_EVENTS.has(event)) {
      const existing = this.debounceTimers.get(event);
      if (existing) clearTimeout(existing);
      this.debounceTimers.set(
        event,
        setTimeout(() => {
          this.debounceTimers.delete(event);
          this.dispatch(event, payload, sourceWidgetId);
        }, DEBOUNCE_MS),
      );
    } else {
      this.dispatch(event, payload, sourceWidgetId);
    }
  }

  private dispatch(event: string, payload?: unknown, sourceWidgetId?: string): void {
    console.log(`[event-bus] ${event}`, payload ?? '', sourceWidgetId ? `from:${sourceWidgetId}` : '');
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

    if (callbacks.size >= MAX_LISTENERS_PER_EVENT) {
      console.warn(
        `[event-bus] Warning: ${callbacks.size} listeners for "${event}" (max ${MAX_LISTENERS_PER_EVENT}). Possible memory leak.`,
      );
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
