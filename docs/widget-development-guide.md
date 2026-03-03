# Widget Development Guide

Complete guide to creating new widgets for the Everything App. Follow this guide step by step — each widget is a self-contained module that plugs into the shell automatically.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Quick Start (5 min)](#quick-start)
3. [File Structure](#file-structure)
4. [Manifest Reference](#manifest-reference)
5. [WidgetContext API](#widgetcontext-api)
6. [Creating the Compact View](#creating-the-compact-view)
7. [Creating the Expanded View](#creating-the-expanded-view)
8. [Registration & Wiring](#registration--wiring)
9. [Persisting Data (SQLite)](#persisting-data-sqlite)
10. [Settings Schema](#settings-schema)
11. [Event Bus (Inter-Widget Communication)](#event-bus)
12. [Shared State](#shared-state)
13. [Rust Backend Commands](#rust-backend-commands)
14. [Notifications](#notifications)
15. [Styling Guidelines](#styling-guidelines)
16. [Best Practices & Patterns](#best-practices--patterns)
17. [Common Pitfalls](#common-pitfalls)
18. [Full Example: Pomodoro Timer Widget](#full-example-pomodoro-timer-widget)
19. [Checklist](#checklist)

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│  Shell (Sidebar, TopBar, WidgetGrid)    │
│                                         │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │ Widget A  │  │ Widget B │  │Widget C││
│  │(Compact)  │  │(Compact) │  │(Comp.) ││
│  └──────────┘  └──────────┘  └────────┘│
│                                         │
│  Widget Runtime (context injection)     │
│  - Event Bus (zustand) ←→ any widget    │
│  - Shared State (zustand) ←→ namespaced │
│  - Settings Cache ←→ SQLite             │
│  - Data Cache ←→ SQLite                 │
└──────────────────┬──────────────────────┘
                   │ invoke()
┌──────────────────┴──────────────────────┐
│  Rust Backend (Tauri)                   │
│  - SQLite database (WAL mode)           │
│  - Audio capture (cpal)                 │
│  - HTTP requests (reqwest)              │
│  - File system, notifications, etc.     │
└─────────────────────────────────────────┘
```

Each widget is an **isolated React component**. Widgets:
- Never import from other widgets directly
- Communicate via the Event Bus or Shared State
- Access system resources via `ctx.invoke()` (Tauri commands)
- Store data in SQLite via `ctx.db`
- Declare everything in `manifest.json` (metadata, permissions, events, settings)

---

## Quick Start

Create a minimal widget in 4 files:

```bash
mkdir src/widgets/my-widget
```

### 1. `manifest.json`

```json
{
  "id": "my-widget",
  "name": "My Widget",
  "description": "A short description of what this widget does",
  "icon": "Sparkles",
  "type": "native",
  "grid": {
    "minW": 2,
    "minH": 2,
    "defaultW": 3,
    "defaultH": 3
  },
  "permissions": ["database"],
  "events": {
    "emits": [],
    "listens": []
  },
  "sharedState": {
    "reads": [],
    "writes": []
  },
  "hasExpandedView": false,
  "hasRustModule": false,
  "settings": {}
}
```

### 2. `MyWidgetCompact.tsx`

```tsx
import type { WidgetViewProps } from '@/lib/widget-sdk/types';

export function MyWidgetCompact({ ctx }: WidgetViewProps) {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-sm text-muted-foreground">Hello from {ctx.widgetId}!</p>
    </div>
  );
}
```

### 3. `config.ts`

```ts
import { registerWidget } from '@/lib/widget-sdk/registry';
import manifest from './manifest.json';
import { MyWidgetCompact } from './MyWidgetCompact';
import type { WidgetManifest } from '@/lib/widget-sdk/types';

registerWidget({
  manifest: manifest as WidgetManifest,
  CompactView: MyWidgetCompact,
});
```

### 4. Register in `src/main.tsx`

Add one line at the top with the other widget imports:

```ts
import '@/widgets/my-widget/config';
```

Done. Run `pnpm tauri dev`, open the Widget Catalog (sidebar `+` button), and your widget appears automatically.

---

## File Structure

Every widget lives in `src/widgets/<widget-name>/` with kebab-case naming:

```
src/widgets/my-widget/
├── manifest.json              # Required — metadata, constraints, permissions
├── MyWidgetCompact.tsx        # Required — grid card view
├── MyWidgetExpanded.tsx       # Optional — full-page view (set hasExpandedView: true)
├── config.ts                  # Required — registers widget in the registry
└── utils.ts                   # Optional — shared helpers within the widget
```

### Naming Convention

| File | Convention | Example |
|---|---|---|
| Folder | kebab-case | `my-widget/` |
| Compact view | PascalCase + `Compact` | `MyWidgetCompact.tsx` |
| Expanded view | PascalCase + `Expanded` | `MyWidgetExpanded.tsx` |
| Config | `config.ts` (always) | `config.ts` |
| Sub-components | PascalCase | `BreathingExercise.tsx` |
| Utilities | kebab-case | `utils.ts` |

---

## Manifest Reference

The `manifest.json` file is the single source of truth for your widget's metadata. The shell reads it to:
- Show your widget in the catalog
- Enforce grid constraints
- Render settings UI automatically
- Document event contracts

### Full Schema

```json
{
  "id": "my-widget",
  "name": "My Widget",
  "description": "One-line description shown in the widget catalog",
  "icon": "Sparkles",
  "type": "native",
  "grid": {
    "minW": 2,
    "minH": 2,
    "maxW": 6,
    "maxH": 6,
    "defaultW": 3,
    "defaultH": 3
  },
  "permissions": ["database", "notifications", "filesystem"],
  "events": {
    "emits": ["mywidget:action_done"],
    "listens": ["task:completed"]
  },
  "sharedState": {
    "reads": ["tasks:today"],
    "writes": ["mywidget:data"]
  },
  "hasExpandedView": true,
  "hasRustModule": false,
  "settings": {
    "refreshInterval": {
      "type": "number",
      "label": "Refresh interval (seconds)",
      "default": 30
    }
  }
}
```

### Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Unique kebab-case identifier. Must match folder name. |
| `name` | `string` | Yes | Human-readable display name (shown in catalog and card header). |
| `description` | `string` | Yes | One-line description (shown in catalog). |
| `icon` | `string` | Yes | Lucide icon name in PascalCase (e.g., `"SquareCheckBig"`, `"Wind"`, `"Mic"`, `"Globe"`). Browse at [lucide.dev](https://lucide.dev/icons/). |
| `type` | `"native" \| "web"` | Yes | `"native"` for standard widgets, `"web"` for iframe-based widgets. |
| `grid` | `GridConstraints` | Yes | See below. |
| `permissions` | `string[]` | Yes | Capabilities this widget needs. Informational (not enforced at runtime). |
| `events.emits` | `string[]` | Yes | Events this widget may emit. Format: `domain:action`. |
| `events.listens` | `string[]` | Yes | Events this widget subscribes to. |
| `sharedState.reads` | `string[]` | Yes | Shared state namespaces this widget reads. |
| `sharedState.writes` | `string[]` | Yes | Shared state namespaces this widget writes to. One namespace = one owner. |
| `hasExpandedView` | `boolean` | Yes | If `true`, the expand button appears in the card header. |
| `hasRustModule` | `boolean` | Yes | If `true`, this widget has a Rust backend module. |
| `settings` | `Record<string, SettingSchema>` | Yes | Settings schema — the shell auto-generates the settings UI from this. Use `{}` if no settings. |

### Grid Constraints

| Field | Type | Required | Description |
|---|---|---|---|
| `minW` | `number` | Yes | Minimum width in grid columns (1-12). Recommended: `2`. |
| `minH` | `number` | Yes | Minimum height in grid rows. Recommended: `2`. |
| `maxW` | `number` | No | Maximum width. Omit for no limit. |
| `maxH` | `number` | No | Maximum height. Omit for no limit. |
| `defaultW` | `number` | Yes | Default width when added to grid. |
| `defaultH` | `number` | Yes | Default height when added to grid. |

Grid is 12 columns wide. Each row is ~80px tall.

### Permission Values

| Permission | When to declare |
|---|---|
| `"database"` | Widget uses `ctx.db.*` |
| `"notifications"` | Widget uses `ctx.notify()` |
| `"filesystem"` | Widget accesses files via Tauri FS plugin |
| `"network"` | Widget makes HTTP requests |

### Event Naming Convention

Events use `domain:action` format:

```
task:created       task:completed     task:deleted
craving:started    craving:resisted   craving:failed
voice:transcription_ready
mywidget:data_updated
```

- **Domain** = your widget's short name
- **Action** = past tense verb or noun

---

## WidgetContext API

Every view component receives `{ ctx: WidgetContext }` as props. This is your widget's API to the platform.

```typescript
interface WidgetContext {
  widgetId: string;       // Unique instance ID (e.g., "daily-tasks-abc123")

  // Event Bus
  emit(event: string, payload?: unknown): void;
  on(event: string, callback: (payload: unknown) => void): UnsubscribeFn;

  // Database (SQLite, per-widget key-value)
  db: {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<void>;
    query(table: string, filter?: object): Promise<unknown[]>;  // stub
  };

  // Shared State (in-memory, cross-widget)
  sharedState: {
    read(namespace: string): unknown;
    write(namespace: string, value: unknown): void;
    subscribe(namespace: string, callback: (value: unknown) => void): UnsubscribeFn;
  };

  // Settings (from manifest schema, persisted to SQLite)
  settings: {
    get(key: string): unknown;           // Synchronous — from in-memory cache
    set(key: string, value: unknown): Promise<void>;
    getAll(): Record<string, unknown>;
  };

  // Native Notifications (OS-level)
  notify(title: string, body: string): void;

  // Tauri Invoke (call any Rust command)
  invoke(command: string, args?: object): Promise<unknown>;
}
```

### Important Notes

- `ctx.settings.get()` is **synchronous** — settings are preloaded into an in-memory cache before the widget renders.
- `ctx.db.get/set/delete` are **async** — they go through SQLite. Data is cached per-widget after first load.
- `ctx.on()` returns an `UnsubscribeFn` — **always call it in a cleanup function** (useEffect return).
- `ctx.emit()` is fire-and-forget — no return value, no error.
- `ctx.invoke()` calls Rust commands — the command must be registered in `lib.rs`.

---

## Creating the Compact View

The compact view is the main view displayed inside the grid card. It must work well at any size within the grid constraints.

```tsx
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import type { WidgetViewProps } from '@/lib/widget-sdk/types';

export function MyWidgetCompact({ ctx }: WidgetViewProps) {
  const [count, setCount] = useState(0);

  // Load persisted data on mount
  useEffect(() => {
    ctx.db.get('count').then((val) => {
      if (typeof val === 'number') setCount(val);
    });
  }, [ctx]);

  // Subscribe to events from other widgets
  useEffect(() => {
    const unsub = ctx.on('task:completed', () => {
      setCount((prev) => prev + 1);
    });
    return unsub; // Always cleanup
  }, [ctx]);

  const handleClick = useCallback(async () => {
    const next = count + 1;
    setCount(next);
    await ctx.db.set('count', next);
    ctx.emit('mywidget:incremented', { count: next });
  }, [ctx, count]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      <p className="text-2xl font-bold">{count}</p>
      <Button size="sm" onClick={handleClick}>
        Increment
      </Button>
    </div>
  );
}
```

### Rules for Compact View

1. **Always use `h-full`** on the root element — the card manages height.
2. **Receive `{ ctx }: WidgetViewProps`** — never destructure further in the function signature.
3. **Use shadcn/ui components** — `Button`, `Input`, `Card`, etc. from `@/components/ui/`.
4. **Use Tailwind classes** — no inline styles, no CSS modules.
5. **Be responsive** — the user can resize the card. Use `flex`, `overflow-auto`, `truncate`.
6. **Cleanup subscriptions** — any `ctx.on()` or `onSettingsChange()` must return the unsub in useEffect.

---

## Creating the Expanded View

The expanded view replaces the entire grid with a full-page view. It has the same props interface.

```tsx
import type { WidgetViewProps } from '@/lib/widget-sdk/types';

export function MyWidgetExpanded({ ctx }: WidgetViewProps) {
  return (
    <div className="flex h-full flex-col gap-4">
      <h2 className="text-lg font-semibold">My Widget — Full View</h2>
      <p className="text-sm text-muted-foreground">Widget ID: {ctx.widgetId}</p>
      {/* Your expanded content here */}
    </div>
  );
}
```

### Rules for Expanded View

1. Set `"hasExpandedView": true` in `manifest.json`.
2. Export the component and register it in `config.ts` as `ExpandedView`.
3. The shell wraps it in a scrollable container with `p-4` padding — don't add extra outer padding.
4. A back button is provided by the shell — no need to handle navigation.
5. The shell provides an `WidgetErrorBoundary` wrapper — crashes are isolated.

---

## Registration & Wiring

### `config.ts` — Without Expanded View

```ts
import { registerWidget } from '@/lib/widget-sdk/registry';
import manifest from './manifest.json';
import { MyWidgetCompact } from './MyWidgetCompact';
import type { WidgetManifest } from '@/lib/widget-sdk/types';

registerWidget({
  manifest: manifest as WidgetManifest,
  CompactView: MyWidgetCompact,
});
```

### `config.ts` — With Expanded View

```ts
import { registerWidget } from '@/lib/widget-sdk/registry';
import manifest from './manifest.json';
import { MyWidgetCompact } from './MyWidgetCompact';
import { MyWidgetExpanded } from './MyWidgetExpanded';
import type { WidgetManifest } from '@/lib/widget-sdk/types';

registerWidget({
  manifest: manifest as WidgetManifest,
  CompactView: MyWidgetCompact,
  ExpandedView: MyWidgetExpanded,
});
```

### `src/main.tsx` — Add Import

```ts
// Widget registrations (side-effect imports)
import '@/widgets/daily-tasks/config';
import '@/widgets/craving-control/config';
import '@/widgets/voice-recorder/config';
import '@/widgets/web-widget/config';
import '@/widgets/my-widget/config';       // ← Add this line
```

The import is a **side-effect import** — it runs `registerWidget()` at startup. The widget catalog reads from the registry, so your widget automatically appears in the "Add Widget" sheet and command palette.

---

## Persisting Data (SQLite)

Widget data is stored as key-value pairs in the `widget_data` SQLite table. Each key is scoped to the widget instance.

```tsx
// Save data
await ctx.db.set('tasks', [{ id: 1, text: 'Buy groceries', done: false }]);

// Read data
const tasks = await ctx.db.get('tasks') as Task[] | undefined;

// Delete data
await ctx.db.delete('tasks');
```

### How It Works Under the Hood

- `ctx.db.set(key, value)` → `invoke('save_widget_data', { input: { id, widgetInstanceId, key, value: JSON.stringify(value) } })`
- Values are JSON-serialized automatically.
- A per-widget in-memory cache avoids repeated DB reads. First `get()` loads all keys for the widget, subsequent reads hit the cache.

### Best Practices

- Use **descriptive key names**: `'tasks'`, `'history'`, `'lastSync'` — not `'d'` or `'tmp'`.
- Store **structured objects** — the value is JSON-serialized.
- Don't store large blobs (>1MB) — SQLite is not designed for that. Use the filesystem for files.
- For lists, store the entire array under one key, not individual items under separate keys.

---

## Settings Schema

Settings defined in `manifest.json` get an **auto-generated UI** in the widget's settings dialog (gear icon in card header). The user edits settings, they're persisted to SQLite, and the widget re-renders automatically.

### Supported Types

| Type | UI Component | Example |
|---|---|---|
| `"string"` | Text input | URL, title, name |
| `"number"` | Number input | Interval, count, duration |
| `"boolean"` | Toggle switch | Enable/disable feature |
| `"select"` | Dropdown | Language, mode, theme |
| `"password"` | Password input with "Change" button | API keys |

### Example

```json
{
  "settings": {
    "refreshInterval": {
      "type": "number",
      "label": "Refresh interval (seconds)",
      "default": 30
    },
    "language": {
      "type": "select",
      "label": "Language",
      "default": "en",
      "options": [
        { "label": "English", "value": "en" },
        { "label": "Italiano", "value": "it" }
      ]
    },
    "apiKey": {
      "type": "password",
      "label": "API Key",
      "default": ""
    },
    "showCompleted": {
      "type": "boolean",
      "label": "Show completed items",
      "default": true
    }
  }
}
```

### Reading Settings in Your Widget

```tsx
// Synchronous — reads from in-memory cache (preloaded before widget mounts)
const interval = ctx.settings.get('refreshInterval') as number;
const lang = ctx.settings.get('language') as string;
const all = ctx.settings.getAll();

// Programmatic update (rare — usually done via the settings dialog)
await ctx.settings.set('refreshInterval', 60);
```

### Reacting to Settings Changes

The shell re-renders your widget when settings change. If you need additional logic:

```tsx
import { onSettingsChange } from '@/lib/widget-sdk/settings-cache';

useEffect(() => {
  return onSettingsChange(ctx.widgetId, () => {
    const newVal = ctx.settings.get('url') as string;
    setUrl(newVal);
  });
}, [ctx]);
```

---

## Event Bus

The event bus enables decoupled communication between widgets. Any widget can emit events; any widget can subscribe.

### Emitting Events

```tsx
// Simple event
ctx.emit('mywidget:action_done');

// Event with payload
ctx.emit('mywidget:data_updated', { count: 42, timestamp: Date.now() });
```

### Subscribing to Events

```tsx
useEffect(() => {
  const unsub = ctx.on('task:completed', (payload) => {
    console.log('Task completed!', payload);
  });
  return unsub; // CRITICAL: always cleanup
}, [ctx]);
```

### Debounced Events

Some events are debounced (100ms) to prevent rapid-fire updates:
- `task:completed`
- `craving:resisted`

To add more debounced events, edit `DEBOUNCE_EVENTS` in `src/lib/widget-sdk/event-bus.ts`.

### Existing Events in the App

| Event | Emitted By | Payload |
|---|---|---|
| `task:created` | Daily Tasks | `{ task }` |
| `task:completed` | Daily Tasks | `{ taskId }` |
| `craving:started` | Craving Control | `{ timestamp }` |
| `craving:resisted` | Craving Control | `{ timestamp, breathingCycles }` |
| `craving:failed` | Craving Control | `{ timestamp }` |
| `voice:transcription_ready` | Voice Recorder | `{ text }` |

---

## Shared State

Shared state is an in-memory cross-widget data store. Unlike events (fire-and-forget), shared state persists in memory and can be read at any time.

```tsx
// Write (only the owning widget should write)
ctx.sharedState.write('mywidget:stats', { total: 42 });

// Read (any widget can read any namespace)
const stats = ctx.sharedState.read('mywidget:stats') as MyStats;

// Subscribe to changes
useEffect(() => {
  const unsub = ctx.sharedState.subscribe('tasks:today', (value) => {
    setTasks(value as Task[]);
  });
  return unsub;
}, [ctx]);
```

### Rules

- **One writer per namespace** — declare ownership in `manifest.json > sharedState.writes`.
- **Multiple readers** — declare dependencies in `manifest.json > sharedState.reads`.
- **In-memory only** — shared state resets on app restart. Use `ctx.db` for persistence.

---

## Rust Backend Commands

For system-level operations (HTTP requests, file I/O, audio, etc.), create Rust commands.

### 1. Define the command in Rust

`src-tauri/src/commands/my_widget.rs`:
```rust
use tauri::State;
use crate::db::SqlitePool;

#[tauri::command]
pub async fn my_widget_fetch_data(
    pool: State<'_, SqlitePool>,
    query: String,
) -> Result<String, String> {
    // Your logic here
    Ok(format!("Result for: {}", query))
}
```

### 2. Export from mod.rs

`src-tauri/src/commands/mod.rs`:
```rust
pub mod my_widget;
```

### 3. Register in lib.rs

```rust
.invoke_handler(tauri::generate_handler![
    // ...existing commands...
    commands::my_widget::my_widget_fetch_data,
])
```

### 4. Call from frontend

```tsx
const result = await ctx.invoke('my_widget_fetch_data', { query: 'hello' });
```

**Note:** Rust `snake_case` parameter names automatically map to JavaScript `camelCase`.

---

## Notifications

Send native OS notifications:

```tsx
ctx.notify('Task Completed', 'You finished all your daily tasks!');
```

This uses the `tauri-plugin-notification` under the hood. The notification appears in the Windows notification center.

Declare `"notifications"` in your manifest permissions.

---

## Styling Guidelines

### Use shadcn/ui Components

```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
```

Add new shadcn components with:
```bash
pnpm dlx shadcn@latest add <component-name>
```

### Use Tailwind Semantic Colors

```tsx
// DO — uses theme-aware semantic colors
<p className="text-foreground">Primary text</p>
<p className="text-muted-foreground">Secondary text</p>
<div className="bg-card border-border">Card</div>
<span className="text-destructive">Error</span>

// DON'T — hardcoded colors break in dark/light theme
<p className="text-gray-800">Breaks in dark mode</p>
<div className="bg-white">Breaks in dark mode</div>
```

### Common Semantic Colors

| Class | Usage |
|---|---|
| `text-foreground` | Primary text |
| `text-muted-foreground` | Secondary/helper text |
| `bg-background` | Page background |
| `bg-card` | Card surfaces |
| `bg-muted` | Subtle backgrounds |
| `border-border` | Borders |
| `text-destructive` | Error/danger text |
| `text-primary` | Accent/brand text |

### Text Sizing Convention

| Context | Class |
|---|---|
| Widget card title | `text-xs font-medium` |
| Widget card body text | `text-sm` |
| Small labels/metadata | `text-[10px] text-muted-foreground` |
| Expanded view headings | `text-lg font-semibold` |
| Expanded view body | `text-sm` |

### Icons

Use Lucide React icons (the icon library used by shadcn/ui):

```tsx
import { Check, Trash2, Plus, RefreshCw } from 'lucide-react';

<Check className="h-4 w-4" />          // Standard icon
<Check className="h-3 w-3" />          // Small (card header buttons)
<Check className="h-5 w-5" />          // Medium (empty states)
<Check className="h-8 w-8" />          // Large (hero/empty states)
```

---

## Best Practices & Patterns

### 1. Always Cleanup Subscriptions

```tsx
// GOOD
useEffect(() => {
  const unsub = ctx.on('some:event', handler);
  return unsub;
}, [ctx]);

// BAD — memory leak
useEffect(() => {
  ctx.on('some:event', handler);
}, [ctx]);
```

### 2. Memoize Expensive Computations

```tsx
const sortedTasks = useMemo(
  () => tasks.filter((t) => !t.done).sort((a, b) => a.priority - b.priority),
  [tasks],
);
```

### 3. Use useCallback for Event Handlers Passed as Props

```tsx
const handleDelete = useCallback(async (id: string) => {
  await ctx.db.delete(id);
  setItems((prev) => prev.filter((item) => item.id !== id));
}, [ctx]);
```

### 4. Type Your Data

```tsx
interface Task {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
}

// Type assertion when reading from DB
const tasks = (await ctx.db.get('tasks') as Task[]) ?? [];
```

### 5. Handle Loading States

```tsx
const [loading, setLoading] = useState(true);

useEffect(() => {
  ctx.db.get('data').then((val) => {
    setData(val as MyData ?? defaultData);
    setLoading(false);
  });
}, [ctx]);

if (loading) {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}
```

### 6. Handle Empty States

```tsx
if (items.length === 0) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
      <ListTodo className="h-8 w-8" />
      <p className="text-sm">No items yet</p>
      <Button size="sm" variant="outline" onClick={handleAdd}>
        Add first item
      </Button>
    </div>
  );
}
```

### 7. Debounce Frequent Saves

```tsx
const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

function debouncedSave(data: unknown) {
  clearTimeout(saveTimeoutRef.current);
  saveTimeoutRef.current = setTimeout(() => {
    ctx.db.set('data', data);
  }, 300);
}
```

### 8. Generate Unique IDs

```tsx
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
```

---

## Common Pitfalls

### 1. Forgetting to Cleanup Event Subscriptions

Every `ctx.on()` and `onSettingsChange()` returns an unsubscribe function. If you don't call it, you'll get memory leaks and the event bus will warn you at 20+ listeners.

### 2. Storing Non-Serializable Data in ctx.db

`ctx.db.set()` JSON-serializes the value. Functions, `Date` objects, `Map`, `Set`, etc. will not round-trip correctly. Convert to primitives first:

```tsx
// BAD
await ctx.db.set('date', new Date());

// GOOD
await ctx.db.set('date', new Date().toISOString());
```

### 3. Not Using `h-full` on Root Element

The widget card manages height. If your root element doesn't use `h-full`, the content won't fill the card:

```tsx
// BAD — content collapses
return <div>...</div>;

// GOOD — fills the card
return <div className="flex h-full flex-col">...</div>;
```

### 4. Reading Settings Before They're Loaded

Settings are preloaded into an in-memory cache before the widget mounts. `ctx.settings.get()` is synchronous and safe to call at render time. But if you try to use `ctx.settings.get()` outside a widget component (before initialization), the cache may be empty.

### 5. Importing from Other Widgets

```tsx
// NEVER DO THIS
import { SomeHelper } from '@/widgets/other-widget/utils';

// Instead, communicate via events or shared state
ctx.on('other-widget:data_ready', (payload) => { ... });
```

### 6. Hardcoded Colors

Always use semantic Tailwind classes (`text-foreground`, `bg-card`, etc.). Never use hardcoded colors (`text-gray-800`, `bg-white`) — they break in dark/light theme switching.

### 7. Inline Layouts Object in react-grid-layout

This is a shell concern, not a widget concern, but worth knowing: never pass inline `layouts={{...}}` to `ResponsiveGridLayout` — it causes infinite re-renders. Always memoize.

---

## Full Example: Pomodoro Timer Widget

A complete, realistic example showing all patterns:

### `src/widgets/pomodoro/manifest.json`

```json
{
  "id": "pomodoro",
  "name": "Pomodoro Timer",
  "description": "Focus timer with work/break cycles and session tracking",
  "icon": "Timer",
  "type": "native",
  "grid": {
    "minW": 2,
    "minH": 2,
    "maxW": 4,
    "maxH": 4,
    "defaultW": 2,
    "defaultH": 2
  },
  "permissions": ["database", "notifications"],
  "events": {
    "emits": ["pomodoro:completed", "pomodoro:break_started"],
    "listens": ["task:completed"]
  },
  "sharedState": {
    "reads": [],
    "writes": ["pomodoro:stats"]
  },
  "hasExpandedView": true,
  "hasRustModule": false,
  "settings": {
    "workMinutes": {
      "type": "number",
      "label": "Work duration (minutes)",
      "default": 25
    },
    "breakMinutes": {
      "type": "number",
      "label": "Break duration (minutes)",
      "default": 5
    },
    "autoStartBreak": {
      "type": "boolean",
      "label": "Auto-start break after work",
      "default": true
    }
  }
}
```

### `src/widgets/pomodoro/PomodoroCompact.tsx`

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { WidgetViewProps } from '@/lib/widget-sdk/types';

type Phase = 'work' | 'break' | 'idle';

export function PomodoroCompact({ ctx }: WidgetViewProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [sessionsToday, setSessionsToday] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const workMinutes = (ctx.settings.get('workMinutes') as number) ?? 25;
  const breakMinutes = (ctx.settings.get('breakMinutes') as number) ?? 5;
  const autoStartBreak = (ctx.settings.get('autoStartBreak') as boolean) ?? true;

  // Load persisted sessions count
  useEffect(() => {
    ctx.db.get('sessionsToday').then((val) => {
      if (typeof val === 'number') setSessionsToday(val);
    });
  }, [ctx]);

  // Timer tick
  useEffect(() => {
    if (!running) {
      clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          handlePhaseComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePhaseComplete = useCallback(() => {
    setRunning(false);
    if (phase === 'work') {
      const newCount = sessionsToday + 1;
      setSessionsToday(newCount);
      ctx.db.set('sessionsToday', newCount);
      ctx.emit('pomodoro:completed', { sessions: newCount });
      ctx.sharedState.write('pomodoro:stats', { sessionsToday: newCount });
      ctx.notify('Pomodoro', 'Work session complete! Time for a break.');

      if (autoStartBreak) {
        setPhase('break');
        setSecondsLeft(breakMinutes * 60);
        setRunning(true);
        ctx.emit('pomodoro:break_started');
      } else {
        setPhase('idle');
      }
    } else if (phase === 'break') {
      ctx.notify('Pomodoro', 'Break over! Ready for the next session?');
      setPhase('idle');
    }
  }, [phase, sessionsToday, autoStartBreak, breakMinutes, ctx]);

  const startWork = useCallback(() => {
    setPhase('work');
    setSecondsLeft(workMinutes * 60);
    setRunning(true);
  }, [workMinutes]);

  const togglePause = useCallback(() => {
    setRunning((prev) => !prev);
  }, []);

  const reset = useCallback(() => {
    setRunning(false);
    setPhase('idle');
    setSecondsLeft(0);
  }, []);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      {phase === 'idle' ? (
        <>
          <p className="text-xs text-muted-foreground">{sessionsToday} sessions today</p>
          <Button size="sm" onClick={startWork}>
            <Play className="mr-1.5 h-3 w-3" />
            Start Focus
          </Button>
        </>
      ) : (
        <>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {phase === 'work' ? 'Focus' : 'Break'}
          </p>
          <p className="text-3xl font-bold tabular-nums">{display}</p>
          <div className="flex gap-1.5">
            <Button size="icon" variant="outline" className="h-7 w-7" onClick={togglePause}>
              {running ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </Button>
            <Button size="icon" variant="outline" className="h-7 w-7" onClick={reset}>
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">{sessionsToday} sessions</p>
        </>
      )}
    </div>
  );
}
```

### `src/widgets/pomodoro/config.ts`

```ts
import { registerWidget } from '@/lib/widget-sdk/registry';
import manifest from './manifest.json';
import { PomodoroCompact } from './PomodoroCompact';
import type { WidgetManifest } from '@/lib/widget-sdk/types';

registerWidget({
  manifest: manifest as WidgetManifest,
  CompactView: PomodoroCompact,
});
```

### `src/main.tsx`

```ts
import '@/widgets/pomodoro/config';
```

---

## Checklist

Before shipping a new widget, verify:

- [ ] `manifest.json` has all required fields with valid values
- [ ] `id` in manifest matches the folder name
- [ ] `icon` is a valid Lucide icon name (PascalCase)
- [ ] Grid constraints are sensible (`minW`/`minH` >= 2 recommended)
- [ ] `config.ts` calls `registerWidget()` with `manifest as WidgetManifest`
- [ ] Import added to `src/main.tsx`
- [ ] Compact view root element uses `h-full`
- [ ] All `ctx.on()` subscriptions cleaned up in useEffect return
- [ ] All `onSettingsChange()` subscriptions cleaned up
- [ ] Data loaded from `ctx.db` handles `undefined` (first-time use)
- [ ] Settings read via `ctx.settings.get()` have fallback defaults
- [ ] No direct imports from other widget folders
- [ ] Uses semantic Tailwind colors (not hardcoded)
- [ ] Works in both dark and light theme
- [ ] Works at minimum grid size
- [ ] TypeScript compiles without errors (`pnpm build`)
