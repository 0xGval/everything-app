import type { FC } from 'react';

export interface GridConstraints {
  minW: number;
  minH: number;
  maxW?: number;
  maxH?: number;
  defaultW: number;
  defaultH: number;
}

export interface SettingSchema {
  type: 'string' | 'number' | 'boolean' | 'select' | 'password';
  label: string;
  default: unknown;
  options?: { label: string; value: string }[];
}

export interface WidgetManifest {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'native' | 'web';
  grid: GridConstraints;
  permissions: string[];
  events: {
    emits: string[];
    listens: string[];
  };
  sharedState: {
    reads: string[];
    writes: string[];
  };
  hasExpandedView: boolean;
  hasRustModule: boolean;
  settings: Record<string, SettingSchema>;
}

export type UnsubscribeFn = () => void;

export interface WidgetContext {
  widgetId: string;
  emit: (event: string, payload?: unknown) => void;
  on: (event: string, callback: (payload: unknown) => void) => UnsubscribeFn;
  db: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown) => Promise<void>;
    query: (table: string, filter?: object) => Promise<unknown[]>;
    delete: (key: string) => Promise<void>;
  };
  sharedState: {
    read: (namespace: string) => unknown;
    write: (namespace: string, value: unknown) => void;
    subscribe: (namespace: string, callback: (value: unknown) => void) => UnsubscribeFn;
  };
  settings: {
    get: (key: string) => unknown;
    set: (key: string, value: unknown) => Promise<void>;
    getAll: () => Record<string, unknown>;
  };
  notify: (title: string, body: string) => void;
  invoke: (command: string, args?: object) => Promise<unknown>;
}

export interface WidgetViewProps {
  ctx: WidgetContext;
}

export interface WidgetDefinition {
  manifest: WidgetManifest;
  CompactView: FC<WidgetViewProps>;
  ExpandedView?: FC<WidgetViewProps>;
}
