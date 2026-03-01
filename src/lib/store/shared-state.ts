import { create } from 'zustand';
import type { UnsubscribeFn } from '@/lib/widget-sdk/types';

interface SharedStateData {
  state: Record<string, unknown>;
}

const useSharedStateStore = create<SharedStateData>(() => ({
  state: {},
}));

export function readSharedState(namespace: string): unknown {
  return useSharedStateStore.getState().state[namespace];
}

export function writeSharedState(namespace: string, value: unknown): void {
  useSharedStateStore.setState((prev) => ({
    state: { ...prev.state, [namespace]: value },
  }));
}

export function subscribeSharedState(
  namespace: string,
  callback: (value: unknown) => void,
): UnsubscribeFn {
  let prev = useSharedStateStore.getState().state[namespace];
  return useSharedStateStore.subscribe((curr) => {
    const next = curr.state[namespace];
    if (next !== prev) {
      prev = next;
      callback(next);
    }
  });
}
