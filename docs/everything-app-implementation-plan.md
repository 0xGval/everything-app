# Everything App — Implementation Plan

**Version:** 1.1
**Date:** March 1, 2026
**Based on:** Everything App PRD v1.1 — Updated with verified dependency versions and architectural decisions

---

## How to Use This Plan

Each micro-phase is designed to be **small, self-contained, and independently testable**. Every phase ends with a "Verification" checklist — a set of concrete tests you must pass before moving to the next phase. If a verification step fails, fix it before proceeding.

Estimated times are rough guides for a single developer. Phases are sequential within each major phase, but the order of major phases (1 → 2 → 3 → 4) must be respected.

---

## PHASE 1 — FOUNDATION

The goal of Phase 1 is to go from zero to a working app shell with a draggable widget grid, persistent layout, and one functional widget (Daily Tasks).

---

### 1.1 — Project Scaffolding — COMPLETE (2026-03-01)

**Goal:** Create the Tauri 2.x project with React, TypeScript, Vite, and all base dependencies installed and compiling.

**Steps:**

1. Install prerequisites: Rust toolchain (rustup), Node.js (LTS), pnpm.
2. Create the Tauri 2.x project using `pnpm create tauri-app` with the React + TypeScript + Vite template.
3. Verify the default Tauri app compiles and opens a window.
4. Install frontend dependencies:
   - `pnpm add react-grid-layout` (v2.x has built-in TypeScript types — do NOT install `@types/react-grid-layout`)
   - `pnpm add zustand` (v5.x — note: object selectors require `useShallow` from `zustand/react/shallow`)
   - `pnpm add motion` (the `framer-motion` package was renamed — import from `"motion/react"`)
   - `pnpm add lucide-react`
   - `pnpm add clsx tailwind-merge class-variance-authority`
5. Install and configure TailwindCSS v4:
   - `pnpm add tailwindcss @tailwindcss/vite`
   - TailwindCSS v4 is CSS-first: there is NO `tailwind.config.ts` file, NO `postcss.config.js`, NO `autoprefixer`.
   - Add `@tailwindcss/vite` as a Vite plugin in `vite.config.ts`.
   - Replace the CSS entry point content with `@import "tailwindcss";` — configuration is done via `@theme` directive in CSS.
6. Initialize shadcn/ui: run `pnpm dlx shadcn@latest init`, select the **New York** style (the "default" style is deprecated), leave `tailwind.config` field **empty** (not needed for TailwindCSS v4). This generates `index.css` with OKLCH-based CSS variables for both light and dark mode, and a `components.json` config file. Also install `pnpm add tw-animate-css` (replaces deprecated `tailwindcss-animate`).
7. Add the first batch of shadcn components that the shell needs: `button`, `card`, `dialog`, `dropdown-menu`, `tooltip`, `input`, `toast` (sonner), `sheet`.
8. Install Tauri plugins in `src-tauri/Cargo.toml`:
   - `tauri-plugin-sql` (with SQLite feature)
   - `tauri-plugin-notification`
   - `tauri-plugin-fs`
   - `tauri-plugin-global-shortcut`
   - `tauri-plugin-autostart`
9. Install npm companion packages for Tauri plugins:
   - `pnpm add @tauri-apps/plugin-sql @tauri-apps/plugin-notification @tauri-apps/plugin-fs @tauri-apps/plugin-global-shortcut @tauri-apps/plugin-autostart`
10. Register all plugins in `src-tauri/src/lib.rs`. **Important**: each plugin uses a different initialization pattern:
   - `tauri_plugin_sql` → `Builder::default().build()`
   - `tauri_plugin_notification` → `init()`
   - `tauri_plugin_fs` → `init()`
   - `tauri_plugin_global_shortcut` → `Builder::default().build()`
   - `tauri_plugin_autostart` → `init(MacosLauncher::LaunchAgent, None)`
11. Create capabilities file `src-tauri/capabilities/default.json` with permissions for all plugins (Tauri 2.x uses a capabilities/permissions system instead of the v1 allowlist).
12. Configure ESLint + Prettier (semicolons enabled, single quotes, 2-space indent, 100 char width).
13. Set up the folder structure:

```
everything-app/
├── src/                          # Frontend (React + TypeScript)
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── shell/                # Shell components (Sidebar, TopBar, Grid)
│   │   └── widgets/              # Widget components
│   ├── lib/
│   │   ├── widget-sdk/           # Widget SDK (context, types, event bus)
│   │   ├── store/                # Zustand stores
│   │   └── utils.ts              # Utility functions (cn helper, etc.)
│   ├── widgets/                  # Individual widget folders
│   │   └── daily-tasks/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css                 # TailwindCSS v4 entry + shadcn theme (OKLCH variables)
├── src-tauri/                    # Backend (Rust)
│   ├── src/
│   │   ├── lib.rs                # Tauri entry point (pub fn run), plugin registration
│   │   ├── commands/             # Tauri invoke commands
│   │   └── db/                   # Database initialization and migrations
│   ├── capabilities/
│   │   └── default.json          # Tauri 2.x permissions (replaces v1 allowlist)
│   ├── Cargo.toml
│   └── tauri.conf.json
├── components.json               # shadcn/ui configuration (New York style, no tailwind config)
├── package.json
├── tsconfig.json
└── vite.config.ts                # Includes @tailwindcss/vite plugin
```

**Verification:**
- [x] `pnpm tauri dev` compiles without errors and opens a window.
- [x] The window shows the default Tauri + React page with TailwindCSS styling applied.
- [x] A shadcn `Button` component renders correctly with proper styling and dark mode.
- [x] Rust backend logs "plugins registered" on startup (add a print statement).
- [x] Folder structure matches the plan.

**Known Issues:**
- Vite 7.x emits a warning about Node.js 20.18.0 (wants 20.19+). Build works fine; upgrade Node to suppress.
- `eslint-plugin-react-hooks` has an unmet peer dependency on ESLint 10. Cosmetic only, linting works.

---

### 1.2 — SQLite Database Setup — COMPLETE (2026-03-01)

**Goal:** Initialize the SQLite database on app startup with all core tables, and verify read/write from the frontend.

**Steps:**

1. In the Rust backend, create a database initialization module (`src-tauri/src/db/mod.rs`) that runs on app startup.
2. Create the core tables via SQL migration:
   - `dashboards` (id TEXT PK, name TEXT, icon TEXT, sort_order INTEGER, created_at DATETIME)
   - `widget_instances` (id TEXT PK, widget_type TEXT, dashboard_id TEXT FK, grid_position JSON, settings JSON, created_at DATETIME, updated_at DATETIME)
   - `widget_data` (id TEXT PK, widget_instance_id TEXT FK, key TEXT, value JSON, created_at DATETIME, updated_at DATETIME)
   - `events_log` (id INTEGER PK AUTOINCREMENT, event_name TEXT, payload JSON, source_widget_id TEXT, timestamp DATETIME)
   - `app_settings` (key TEXT PK, value JSON)
3. Enable WAL mode for crash safety.
4. Seed the database with a default dashboard: `{ id: "default", name: "Main", icon: "home", sort_order: 0 }`.
5. Create Tauri invoke commands for basic CRUD:
   - `get_dashboards` → returns all dashboards.
   - `create_dashboard` → inserts a new dashboard.
   - `save_widget_instance` → inserts or updates a widget instance.
   - `get_widget_instances` → returns widget instances for a given dashboard.
   - `save_widget_data` → generic key-value storage for widgets.
   - `get_widget_data` → retrieves data for a widget instance.
6. Test from the frontend by calling `invoke('get_dashboards')` on load and logging the result to the console. **Tauri 2.x note**: import invoke from `@tauri-apps/api/core` (not `@tauri-apps/api/tauri` which was the v1 path).

**Verification:**
- [x] On first launch, the SQLite database file is created in the app data directory.
- [x] The `dashboards` table contains the seeded "Main" dashboard.
- [x] Calling `invoke('get_dashboards')` from the frontend returns the seeded dashboard.
- [x] Calling `invoke('create_dashboard', { ... })` and then `get_dashboards` shows the new entry.
- [x] The database file persists across app restarts.

---

### 1.3 — Shell Layout (Sidebar + Top Bar + Grid Area) — COMPLETE (2026-03-01)

**Goal:** Build the static shell layout with sidebar, top bar, and a central area ready for the widget grid.

**Steps:**

1. Create `ShellLayout.tsx` — the root layout component that structures the three areas (sidebar, top bar, main content).
2. Create `Sidebar.tsx`:
   - Thin vertical bar on the left (width: ~56px collapsed).
   - Render dashboard icons using Lucide icons. Each icon is a shadcn `Tooltip`-wrapped button.
   - Hardcode the "Main" dashboard for now. Bottom section has a settings gear icon.
   - Active dashboard is visually highlighted.
3. Create `TopBar.tsx`:
   - Displays the active dashboard name on the left.
   - "Add Widget" shadcn `Button` with a plus icon on the right.
   - The "Add Widget" button does nothing yet (placeholder).
4. Create `GridArea.tsx`:
   - Central content area that takes all remaining space.
   - For now, render an empty container with a subtle background and a "No widgets yet" placeholder message.
5. Set the app window configuration in `tauri.conf.json`:
   - Title: "Everything App"
   - Default size: 1280x800
   - Min size: 900x600
   - Decorations: true (use native title bar for now)
6. Apply dark mode as default via the Tailwind CSS variables in `index.css`. Both dark and light mode variables are configured from the start (shadcn/ui generates both). Dark mode is set as default via the `dark` class on `<html>`.

**Verification:**
- [x] The app window opens at 1280x800 with the title "Everything App".
- [x] The sidebar is visible on the left with the "Main" dashboard icon and settings icon.
- [x] The top bar shows "Main" and an "Add Widget" button.
- [x] The central area shows the empty placeholder.
- [x] Dark mode is applied (dark background, light text).
- [x] The layout responds to window resizing without breaking (sidebar stays fixed, grid area expands).

---

### 1.4 — Widget Grid with react-grid-layout — COMPLETE (2026-03-01)

**Goal:** Integrate react-grid-layout into the grid area with placeholder widgets that can be dragged and resized.

**Steps:**

1. Import react-grid-layout CSS (required): `import 'react-grid-layout/css/styles.css'` and `import 'react-resizable/css/styles.css'`.
2. Create `WidgetGrid.tsx` that wraps `ResponsiveGridLayout` (imported as `import { Responsive as ResponsiveGridLayout } from 'react-grid-layout'`). Note: in v2.x, the type `RGL.Layout` is now `LayoutItem` and `RGL.Layouts` is now `ResponsiveLayouts`. **Important**: memoize the `layouts` prop — do NOT pass inline objects like `layouts={{...}}` as this causes infinite re-renders in v2.
   - Configure grid columns: 12.
   - Row height: calculated dynamically based on grid area height.
   - Enable drag and resize.
   - Compact type: vertical.
3. Create `WidgetCard.tsx` — the standard wrapper around any widget:
   - Uses shadcn `Card` as the outer container.
   - `CardHeader` with: widget name (left), drag handle icon (grip dots), expand button (maximize icon), settings button (gear icon), all using shadcn `Button` variant ghost.
   - `CardContent` where the widget's React component will be rendered.
   - Resize handle styled in the bottom-right corner.
4. Create 2-3 dummy `PlaceholderWidget` components that render simple colored boxes with text ("Widget A", "Widget B", "Widget C").
5. Hardcode a layout array with these placeholders at different grid positions.
6. Wire up drag and resize: on layout change, log the new layout to the console.

**Verification:**
- [x] The grid area shows 2-3 placeholder widgets in cards.
- [x] Each widget card has a title bar with the grip handle, expand, and settings icons.
- [x] Widgets can be dragged by the handle and snap to the grid.
- [x] Widgets can be resized via the bottom-right handle and respect grid snapping.
- [x] Other widgets reflow when one is moved (vertical compaction).
- [x] The layout change is logged to the console with updated positions.

**Known Issues:**
- react-grid-layout v2 API restructured: `draggableHandle` → `dragConfig.handle`, `compactType` → `compactor` (import `verticalCompactor`), `resizeHandles` → `resizeConfig.handles`. Update CLAUDE.md if referencing old prop names.
- shadcn `CardHeader` uses `grid` + `items-start` which conflicts with flex centering — use plain `div` for widget card headers instead.

---

### 1.5 — Layout Persistence — COMPLETE (2026-03-01)

**Goal:** Save and restore the widget grid layout across app restarts.

**Steps:**

1. Create a Zustand store: `useLayoutStore` with state for the current dashboard's layout (array of `{ widgetId, x, y, w, h }`).
2. On layout change (react-grid-layout callback), update the Zustand store.
3. Create a debounced save function that writes the layout to SQLite via `invoke('save_widget_instance', ...)` for each widget whose position changed.
4. On app startup, load the layout from SQLite via `invoke('get_widget_instances', { dashboardId })` and pass it to the grid.
5. Handle the first-launch case: if no widget instances exist in the DB, use a default layout with the placeholder widgets.

**Verification:**
- [x] On first launch, the default layout is displayed and saved to the DB.
- [x] Drag a widget to a new position, close the app, reopen — the widget is in the saved position.
- [x] Resize a widget, restart — the size is preserved.
- [x] Rearrange multiple widgets, restart — all positions are correct.

---

### 1.6 — Widget SDK Core (Types, Context, Registry) — COMPLETE (2026-03-01)

**Goal:** Define the Widget SDK interfaces and build the widget runtime that loads widgets from a registry and injects the WidgetContext.

**Steps:**

1. Create `src/lib/widget-sdk/types.ts`:
   - `WidgetManifest` interface (id, name, description, icon, type, grid min/max/default, permissions, events, sharedState, hasExpandedView, hasRustModule, settings schema).
   - `WidgetContext` interface (widgetId, emit, on, db, sharedState, settings, notify, invoke).
   - `WidgetDefinition` interface: `{ manifest: WidgetManifest, CompactView: React.FC<{ ctx: WidgetContext }>, ExpandedView?: React.FC<{ ctx: WidgetContext }> }`.
2. Create `src/lib/widget-sdk/registry.ts`:
   - A `WidgetRegistry` that holds a `Map<string, WidgetDefinition>`.
   - `registerWidget(definition: WidgetDefinition)` — adds a widget to the registry.
   - `getWidget(id: string)` — retrieves a widget definition.
   - `getAllWidgets()` — returns all registered widgets (for the catalog).
3. Create `src/lib/widget-sdk/context.ts`:
   - A `createWidgetContext(widgetInstanceId, widgetType)` factory function.
   - For now, implement `db.get/set` (calling Tauri invoke commands scoped to the widget instance), and stub the rest (emit, on, sharedState, settings, notify) with console.log placeholders.
4. Update `WidgetCard.tsx` to:
   - Receive a `widgetInstanceId` and `widgetType`.
   - Look up the widget definition from the registry.
   - Create a `WidgetContext` and pass it to the widget's `CompactView`.
   - Display the widget name and icon from the manifest in the card header.
5. Create a test widget: move one placeholder to `src/widgets/test-widget/` with a proper manifest and a simple CompactView that displays `ctx.widgetId`.

**Verification:**
- [x] The test widget is registered in the registry and appears in the grid.
- [x] The widget card header shows the widget's name and icon from the manifest.
- [x] The widget's CompactView renders and displays its own `widgetId` from the context.
- [x] Calling `ctx.db.set('test', 'hello')` and then `ctx.db.get('test')` returns `'hello'` (data persisted to SQLite).
- [x] Other context methods (emit, on, etc.) log to console without errors.

---

### 1.7 — Event Bus Implementation — COMPLETE (2026-03-02)

**Goal:** Build a working event bus so widgets can emit and listen to events.

**Steps:**

1. Create `src/lib/widget-sdk/event-bus.ts`:
   - A singleton `EventBus` class with:
     - `emit(event: string, payload?: any)` — notifies all listeners for that event.
     - `on(event: string, callback: (payload: any) => void)` — registers a listener, returns an unsubscribe function.
     - Internal `Map<string, Set<Function>>` for subscriptions.
   - Optionally log all events to the `events_log` SQLite table (for debugging and analytics).
2. Wire the event bus into `createWidgetContext` so `ctx.emit` and `ctx.on` use the real EventBus singleton.
3. Create two test widgets:
   - `EventSenderWidget`: has a button "Send Event". On click, calls `ctx.emit('test:ping', { time: Date.now() })`.
   - `EventReceiverWidget`: subscribes to `test:ping` on mount and displays the last received payload.
4. Place both widgets on the grid.

**Verification:**
- [x] Clicking "Send Event" in the sender widget immediately updates the receiver widget with the timestamp.
- [x] Multiple clicks update the receiver each time.
- [x] Removing the receiver widget from the grid (or unmounting) does not cause errors when the sender emits.
- [x] Events are logged to the `events_log` table in SQLite (check via console or a DB viewer).

---

### 1.8 — Shared State Implementation — COMPLETE (2026-03-02)

**Goal:** Implement the Zustand-based shared state system for cross-widget data sharing.

**Steps:**

1. Create `src/lib/store/shared-state.ts`:
   - A Zustand v5 store with a `Record<string, unknown>` structure where each key is a namespace (e.g., `tasks:today`, `craving:stats`).
   - `read(namespace)` — returns the current value.
   - `write(namespace, value)` — updates the value and triggers subscribers.
   - `subscribe(namespace, callback)` — reacts to changes on a specific namespace.
   - **Zustand v5 note**: When selecting multiple fields from the store, wrap the selector with `useShallow` from `zustand/react/shallow` to avoid infinite re-render loops. Example: `const { a, b } = useStore(useShallow((state) => ({ a: state.a, b: state.b })))`. Do NOT use the v4 pattern `useStore(selector, shallow)`.
2. Wire into `createWidgetContext` so `ctx.sharedState.read/write/subscribe` use the real Zustand store.
3. Test with two widgets:
   - Widget A writes to `test:counter` on button click (incrementing a number).
   - Widget B reads `test:counter` and displays it, updating in real time.

**Verification:**
- [x] Widget B displays the counter value in real time as Widget A increments it.
- [x] The shared state persists in memory across widget re-renders (but not across app restarts — this is expected).
- [x] Writing to a namespace that no one reads causes no errors.
- [x] Subscribing to a namespace that no one writes to causes no errors.

---

### 1.9 — Widget Settings System — COMPLETE (2026-03-02)

**Goal:** Allow each widget to have configurable settings, stored in SQLite, accessible via the context, and editable through a dialog.

**Steps:**

1. Implement `ctx.settings.get(key)`, `ctx.settings.set(key, value)`, and `ctx.settings.getAll()` in the context factory, backed by the `widget_instances.settings` JSON column in SQLite.
2. Create `WidgetSettingsDialog.tsx`:
   - A shadcn `Dialog` that opens when the gear icon on a widget card is clicked.
   - Reads the settings schema from the widget's manifest.
   - Dynamically renders form fields based on schema type: `number` → shadcn `Input` type number, `boolean` → shadcn `Switch`, `string` → shadcn `Input`, `select` → shadcn `Select`.
   - On save, writes settings to SQLite and updates the context.
3. Add a setting to the test widget manifest (e.g., `"refreshInterval": { "type": "number", "default": 30, "label": "Refresh interval (seconds)" }`).
4. Display the current setting value inside the test widget to confirm it updates.

**Verification:**
- [x] Clicking the gear icon on a widget card opens the settings dialog.
- [x] The dialog displays the correct fields based on the manifest schema.
- [x] Changing a setting and saving updates the widget's behavior/display immediately.
- [x] Closing and reopening the app preserves the changed settings.
- [x] The dialog is styled correctly with shadcn components in dark mode.

---

### 1.10 — Dashboard Management — COMPLETE (2026-03-02)

**Goal:** Support multiple dashboards with create, rename, delete, and switch functionality.

**Steps:**

1. Create `useDashboardStore` Zustand store: holds the list of dashboards and the active dashboard ID.
2. On app startup, load dashboards from SQLite and set the first one as active.
3. Update `Sidebar.tsx`:
   - Render an icon for each dashboard.
   - Clicking a dashboard icon switches the active dashboard.
   - Active dashboard is visually highlighted (border, background, or indicator dot).
   - A "+" button at the bottom of the dashboard list opens a create dialog.
4. Create `DashboardDialog.tsx` (shadcn `Dialog`):
   - Used for both creating and renaming dashboards.
   - Fields: name (text input), icon (selectable from a predefined set of Lucide icons).
5. Right-clicking a dashboard icon in the sidebar shows a shadcn `DropdownMenu` with: Rename, Delete (with shadcn `AlertDialog` confirmation).
6. Switching dashboards loads the corresponding widget instances and layout from SQLite.

**Verification:**
- [x] The sidebar shows the "Main" default dashboard.
- [x] Clicking "+" creates a new dashboard; it appears in the sidebar immediately.
- [x] Clicking a different dashboard switches the grid to that dashboard's widgets (empty at first).
- [x] Right-click → Rename works and updates the sidebar icon tooltip.
- [x] Right-click → Delete removes the dashboard after confirmation (cannot delete the last one).
- [x] Dashboards persist across app restarts.
- [x] Switching back and forth between dashboards shows the correct widgets each time.

---

### 1.11 — Widget Catalog — COMPLETE (2026-03-02)

**Goal:** Build the slide-in panel that shows all available widgets and allows adding them to the current dashboard.

**Steps:**

1. Create `WidgetCatalog.tsx`:
   - A shadcn `Sheet` (slide-in from the right) triggered by the "Add Widget" button in the top bar.
   - At the top, a shadcn `Input` for search/filter.
   - Lists all widgets from the `WidgetRegistry`, grouped by category.
   - Each widget entry is a shadcn `Card` showing: icon, name, description, and an "Add" `Button`.
2. Clicking "Add" on a widget:
   - Creates a new `widget_instance` in SQLite with default grid position and settings.
   - Adds the widget to the current layout in the Zustand store.
   - The widget immediately appears in the grid.
   - Closes the catalog (or keeps it open — user preference).
3. Add a "Remove" option to the widget card header:
   - Trash icon button in widget header bar (direct button instead of dropdown — Radix DropdownMenu has event conflicts with react-grid-layout's DraggableCore).
   - Removes the widget instance from the grid and deletes it from SQLite.
   - Shows a shadcn `AlertDialog` confirmation before removing.

**Known Issues:**
- Radix DropdownMenuTrigger doesn't work inside react-grid-layout items due to pointer event capture conflicts with DraggableCore. Used direct icon buttons (settings gear + trash) instead.

**Verification:**
- [x] Clicking "Add Widget" in the top bar opens the catalog panel from the right.
- [x] The catalog lists all registered widgets with icons and descriptions.
- [x] Searching/filtering narrows the list in real time.
- [x] Clicking "Add" on a widget places it on the grid immediately.
- [x] The newly added widget is fully functional (context, settings, event bus all work).
- [x] Removing a widget from the grid deletes it from the database.
- [x] Adding the same widget type multiple times creates separate instances.

---

### 1.12 — Daily Tasks Widget (Compact View) — COMPLETE (2026-03-02)

**Goal:** Build the first real widget — a task manager showing today's tasks in a compact grid card.

**Steps:**

1. Create `src/widgets/daily-tasks/manifest.json` with proper metadata (id: `daily-tasks`, name: "Daily Tasks", icon: `SquareCheckBig`, grid defaults 4x4, permissions: database/notifications).
2. Create `DailyTasksCompact.tsx`:
   - Header: today's date and day of week.
   - Task list: each task is a row with a shadcn `Checkbox` and the task title. Completed tasks show strikethrough.
   - Quick-add: a shadcn `Input` at the bottom. Press Enter to add a task.
   - Task count summary: "X/Y" in the header.
3. Data persistence:
   - Use `ctx.db` to save and load tasks. Each task: `{ id, title, isCompleted, dueDate, createdAt }`.
   - Auto-load today's tasks on mount. Tasks filtered by today's date.
4. Events:
   - Emit `task:created` when a new task is added.
   - Emit `task:completed` when a task is checked.
5. Register the widget in the registry.
6. Also implemented `db.delete` — added `delete_widget_data` Rust command (was a stub). Installed shadcn `checkbox` component.

**Verification:**
- [x] The Daily Tasks widget appears in the catalog and can be added to a dashboard.
- [x] Typing a task name and pressing Enter adds it to the list.
- [x] Checking a task marks it as completed (strikethrough).
- [x] Tasks persist across app restarts.
- [x] The "X/Y completed" counter updates correctly.
- [x] `task:created` and `task:completed` events are logged in the events_log table.

---

### 1.13 — Daily Tasks Widget (Expanded View) — COMPLETE (2026-03-02)

**Goal:** Build the expanded full-page view for the Daily Tasks widget with full task management.

**Steps:**

1. Create `DailyTasksExpanded.tsx`:
   - Full task list with columns: checkbox, title, due date, category, delete button.
   - Category support: tasks can be tagged with a category (shadcn `Badge`). Filterable by category using shadcn `Tabs`.
   - Recurring tasks: a toggle in the add-task form to mark a task as recurring (daily, weekly). Recurring tasks regenerate automatically.
   - Weekly overview: a simple 7-day view showing task counts per day.
   - Edit task: clicking a task title opens an inline edit mode or a shadcn `Dialog` for full editing (title, due date, category, notes).
2. Implement the dual-view system in `WidgetCard.tsx`:
   - When the expand button is clicked, the shell replaces the grid with the widget's `ExpandedView`, passing the same `WidgetContext`.
   - A back button (or Escape key) returns to the grid view.
   - Animate the transition with Motion (`import { motion, AnimatePresence } from "motion/react"`) (scale/fade).
3. Wire up the `hasExpandedView: true` flag from the manifest to show/hide the expand button.
4. Created shared `types.ts` and `utils.ts` to eliminate duplication between compact/expanded views:
   - `types.ts`: shared `Task` interface, `CATEGORIES`, `RECURRING_OPTIONS`, `CATEGORY_COLORS` (Personal=blue, Work=amber, Health=green, Learning=purple).
   - `utils.ts`: `todayStr()`, `formatDateDisplay()`, `dayLabel()`, `dayNum()`, `weekDates(referenceDate?)`, `generateRecurring(tasks, targetDate)`.
5. Enhanced compact view (`DailyTasksCompact.tsx`):
   - Category color dot (6px circle) before each task title.
   - `Repeat` icon (12px, muted) after title for recurring tasks.
   - Uses `cn()` for conditional class merging.
6. Enhanced expanded view (`DailyTasksExpanded.tsx`):
   - **Clickable weekly overview with navigation**: `<`/`>` arrows to browse weeks, "Today" reset button, click any day tile to switch task list to that day. Today always has a subtle ring, selected day gets primary highlight.
   - **Future date support**: native `<input type="date">` in the add-task form pre-filled with `selectedDate`. New tasks get the selected due date.
   - **Dynamic header**: shows "Today's Tasks" vs formatted date for other days.
   - **Recurring edit**: recurrence selector (Once/Daily/Weekly badges) added to the edit dialog.
   - **Category color dots** on badges and tab triggers for consistency with compact view.
   - **Shared state fix**: `tasks:today` always reports actual today's counts regardless of `selectedDate`.

**Verification:**
- [x] Clicking the expand button on the Daily Tasks widget replaces the grid with the expanded view.
- [x] Pressing Escape or the back button returns to the grid with all widgets intact.
- [x] Tasks can be edited, deleted, and categorized in the expanded view.
- [x] Recurring tasks appear on subsequent days.
- [x] The weekly overview shows correct task counts.
- [x] Changes made in the expanded view are reflected in the compact view immediately.
- [x] The transition animation is smooth and not jarring.
- [x] Compact view shows category color dots and repeat icons for recurring tasks.
- [x] Weekly overview is clickable — selecting a day shows that day's tasks.
- [x] Week navigation arrows allow browsing past/future weeks.
- [x] Tasks can be added for future dates via the date picker.
- [x] Recurrence can be edited in the edit dialog.

**Known Issues:**
- Recurring task generation (`generateRecurring`) only runs for the actual today on app load. Navigating to a future day in the weekly overview will not show pending recurring tasks for that day — they are generated when the day arrives. This is acceptable for now; future enhancement could generate previews for navigated dates.

---

### 1.14 — Phase 1 Integration Testing — COMPLETE (2026-03-02)

**Goal:** Verify that all Phase 1 components work together as a cohesive application.

**Steps:**

1. Clean up all test/placeholder widgets. Only the Daily Tasks widget should remain in the registry.
2. Test the full workflow end to end:
   - Launch the app fresh (delete the database to simulate first run).
   - Default "Main" dashboard is created. Grid is empty.
   - Open catalog, add Daily Tasks widget.
   - Add tasks, complete some, verify persistence.
   - Expand the widget, edit tasks, return to grid.
   - Create a second dashboard ("Work"). Switch to it. Add another Daily Tasks instance.
   - Verify both dashboards maintain independent layouts and widget instances.
   - Resize and reposition widgets. Restart app. Verify layout persistence.
3. Test error handling:
   - What happens if a widget throws a React error? (Should not crash the app.)
   - What happens if the database is locked? (Should retry or show an error toast.)
4. Performance check: is the app starting under 2 seconds? Is the grid smooth at 60fps?

**Verification:**
- [x] Full end-to-end workflow completes without errors.
- [x] Multiple dashboards work independently.
- [x] Layout persists correctly across restarts.
- [x] A widget error does not crash the shell.
- [x] App startup is under 2 seconds.
- [x] Grid drag/resize is smooth (no visible lag).

**Cleanup performed:**
- Removed 5 test/placeholder widgets: `test-widget`, `event-sender`, `event-receiver`, `counter-writer`, `counter-reader`.
- Removed widget registration imports from `main.tsx`.
- Updated `DEFAULT_WIDGETS` and `DEFAULT_LAYOUT` in `layout-store.ts` to empty arrays (first launch shows clean empty grid).
- Widget catalog now only shows `daily-tasks`.
- Frontend build compiles cleanly with no errors.

---

## PHASE 2 — HEALTH & WELLBEING

Phase 2 adds the Craving Control widget, system tray integration, global hotkeys, notifications, and the first inter-widget communication flow.

---

### 2.1 — Craving Control Widget (Compact View — Core) — COMPLETE (2026-03-02)

**Goal:** Build the compact view with the "I have a craving" button and streak counter.

**Steps:**

1. Create `src/widgets/craving-control/manifest.json` (id: `craving-control`, icon: `Wind`, grid default 2x2, max 4x4, permissions: database/notifications, settings for breathing exercise timing).
2. Create `CravingCompact.tsx`:
   - Large, prominent "I have a craving" button (shadcn `Button`, size `lg`, full width, destructive variant).
   - Streak display: "X cravings resisted" and "Y day streak" below the button with icons.
   - Load streak data from `ctx.db` on mount.
   - `computeStats()` calculates totalResisted + consecutive day streak from craving events.
   - Writes `craving:stats` to shared state on load.
3. On button press:
   - Emit `craving:started` event.
   - Log the craving event to the database with timestamp and `outcome: 'started'`.
   - Transition to the breathing exercise UI (within the same compact card — see next phase).
4. For now, the button just logs the event and increments the counter. The breathing exercise is Phase 2.2.
5. Create `config.ts` — registers widget with manifest + CompactView.
6. Register import in `main.tsx`.

**Verification:**
- [x] The Craving Control widget appears in the catalog and can be added.
- [x] Pressing the button logs a craving event and emits `craving:started`.
- [x] The streak counter updates after each press.
- [x] Streak data persists across restarts.

---

### 2.2 — Breathing Exercise Animation — COMPLETE (2026-03-02)

**Goal:** Build the guided breathing exercise that activates when the craving button is pressed.

**Steps:**

1. Create `BreathingExercise.tsx`:
   - Animated circle using Motion (`import { motion } from "motion/react"`):
     - Expands (inhale): 4 seconds.
     - Holds: 4 seconds.
     - Contracts (exhale): 6 seconds.
   - Text instructions that change with each phase: "Breathe in...", "Hold...", "Breathe out...".
   - Cycle counter: "Cycle 3/5".
   - Configurable via widget settings: inhale duration, hold duration, exhale duration, number of cycles.
2. Integrate into the compact view:
   - When the craving button is pressed, the card content transitions to the breathing exercise (`AnimatePresence` from `"motion/react"`).
   - After all cycles complete, show a completion screen: "Did the craving pass?" with "Yes" and "Not yet" buttons.
   - "Yes" → emit `craving:resisted`, return to default view.
   - "Not yet" → offer another round or show distraction tips, then emit `craving:failed` if the user exits.
3. Add settings to the manifest: `breathingInhale`, `breathingHold`, `breathingExhale`, `breathingCycles`.

**Verification:**
- [x] Pressing the craving button starts the breathing animation immediately.
- [x] The circle smoothly expands, holds, and contracts with correct timing.
- [x] Phase text updates correctly ("Breathe in", "Hold", "Breathe out").
- [x] Cycle counter increments correctly and stops at the configured limit.
- [x] "Yes" emits `craving:resisted` and returns to the default view.
- [x] "Not yet" offers another round.
- [x] Changing breathing durations in settings affects the animation timing.

---

### 2.3 — Craving Control Widget (Expanded View — Statistics) — COMPLETE (2026-03-02)

**Goal:** Build the expanded view with craving history and statistics.

**Steps:**

1. Create `CravingExpanded.tsx` with shadcn `Tabs` for: "History", "Statistics", "Settings".
2. **History tab:**
   - A scrollable list (shadcn `ScrollArea`) of all craving events.
   - Each entry shows: date/time, outcome (resisted ✓ / failed ✗), duration of exercise, optional notes.
   - Allow adding notes to past entries.
3. **Statistics tab:**
   - Total cravings resisted vs failed.
   - Current streak and longest streak.
   - Cravings per day (last 7/30 days) — simple bar chart using a lightweight chart approach (CSS bars or a small chart library).
   - Average time to resist.
   - Success rate percentage.
4. **Settings tab:**
   - Breathing exercise timing configuration.
   - Notification preferences.

**Verification:**
- [x] Expanding the craving widget shows the tabbed interface.
- [x] History tab lists all craving events in reverse chronological order.
- [x] Statistics tab shows accurate calculated metrics.
- [x] After resisting several cravings and failing some, the stats reflect the correct ratios.
- [x] Notes can be added to history entries and persist.

---

### 2.4 — Inter-Widget Communication: Craving ↔ Tasks — COMPLETE (2026-03-02)

**Goal:** When a craving is resisted, the Daily Tasks widget auto-completes a recurring "manage craving" task.

**Steps:**

1. In the Daily Tasks widget, add support for special "auto-complete" tasks that listen for specific events.
2. Create a default recurring task: "Manage craving today" (tagged with category "Health"). This task resets daily.
3. In the Daily Tasks widget, subscribe to `craving:resisted` in the `CompactView` component.
4. When `craving:resisted` is received, auto-check the "Manage craving today" task and show a toast notification ("Craving resisted! Task completed.").
5. Update the Craving widget to also write to shared state: `craving:stats` with latest streak info.

**Verification:**
- [x] With both widgets on the dashboard, resisting a craving automatically checks the health task.
- [x] A toast notification appears confirming the auto-completion.
- [x] If the task was already completed, nothing breaks (idempotent — counter increments instead of duplicating).
- [x] The event flow works across dashboards (if the task widget is on a different dashboard, it still processes the event when it mounts).

---

### 2.5 — Notification System — COMPLETE (2026-03-02)

**Goal:** Integrate native Windows notifications via Tauri.

**Steps:**

1. Create a notification service in `src/lib/widget-sdk/notifications.ts` that wraps `tauri-plugin-notification`.
2. Wire `ctx.notify(title, body, options)` in the WidgetContext to use the notification service.
3. Add notifications to existing widgets:
   - Craving widget: optionally send a motivational notification after resisting ("Great job! That's 5 in a row!").
   - Daily Tasks: notification when all tasks for the day are completed ("All done for today!").
4. Respect per-widget notification settings (can be disabled in widget settings).

**Verification:**
- [x] A native Windows notification appears when all daily tasks are completed.
- [x] A notification appears after resisting a craving (if enabled in settings).
- [x] Disabling notifications in widget settings suppresses them.
- [x] Notifications show correct title and body text.
- [x] Clicking a notification brings the app window to the foreground.

**Known Issues:**
- In dev mode, notifications show as "PowerShell" in Windows notification center (parent process name). Production builds show "Everything App" correctly.

---

### 2.6 — System Tray Integration — COMPLETE (2026-03-02)

**Goal:** The app minimizes to the system tray and can be restored from there.

**Steps:**

1. Configure Tauri system tray using Tauri 2.x API:
   - Enable the `tray-icon` feature in `Cargo.toml`: `tauri = { version = "2", features = ["tray-icon"] }`.
   - Configure `app.trayIcon` in `tauri.conf.json` (note: Tauri 2.x renamed `tauri.systemTray` to `app.trayIcon`).
   - Build the tray in `lib.rs` using `TrayIconBuilder::new()` with `Menu`, `MenuItem::with_id()`, `.on_menu_event()`, and `.on_tray_icon_event()`.
   - On window close: minimize to tray instead of quitting (configurable).
2. Right-click menu on tray icon:
   - "Open Everything App" — restores the window.
   - "Settings" — opens settings dialog.
   - Separator.
   - "Quit" — actually closes the app.
3. Left-click (or double-click) on tray icon: toggle window visibility.
4. Add a setting in app_settings: "Minimize to tray on close" (default: true).

**Verification:**
- [x] Closing the window minimizes to tray (icon visible in system tray).
- [x] Right-click shows the context menu with correct options.
- [x] "Open" restores the window.
- [x] "Quit" fully closes the app.
- [x] Single-click on tray icon toggles the window.
- [ ] Setting "Minimize to tray" to false makes close actually quit the app (deferred — requires app settings UI).

---

### 2.7 — Global Hotkeys and Mini-Mode

**SKIPPED** — Removed on 2026-03-02. Cross-window data sync and event bridging added too much complexity for marginal value. May revisit in a future phase.

---

### 2.8 — Phase 2 Integration Testing

**Goal:** Validate the complete Phase 2 experience.

**Steps:**

1. Full scenario test:
   - User opens full app with Craving Control and Daily Tasks on dashboard.
   - User clicks "I have a craving" → breathing exercise plays.
   - User completes breathing exercise → craving resisted.
   - Notification appears ("Craving resisted!").
   - Daily Tasks shows the "Manage craving today" health task auto-completed.
   - User opens craving expanded view → history and stats are updated.
2. Test edge cases:
   - What if the user spams the craving button during an exercise?
   - What if both widgets are on different dashboards?
3. Performance check: are notifications responsive?

**Status:** COMPLETE (2026-03-02)

**Verification:**
- [x] The full scenario completes without errors.
- [x] No event is lost or duplicated.
- [x] Edge cases are handled gracefully.
- [x] Notifications are timely and correctly formatted.

---

## PHASE 3 — VOICE & WEB

Phase 3 adds the Voice Recorder widget (Rust audio capture + Groq transcription) and the Generic Web Widget (inline iframe).

---

### 3.1 — Rust Audio Capture Module — COMPLETE (2026-03-02)

**Goal:** Build the Rust backend module that captures audio from the microphone and saves it as a WAV file.

**Steps:**

1. Add `cpal` and `hound` (WAV encoding) to `Cargo.toml`.
2. Create `src-tauri/src/commands/audio.rs` with:
   - `list_audio_devices` → returns available input devices.
   - `start_recording` → begins capturing audio from the default (or selected) input device to a temp WAV file. Returns the file path.
   - `stop_recording` → stops capture, finalizes the WAV file, returns `{ path, duration_seconds }`.
3. Use `std::thread::spawn` (not tokio) for recording — keeps cpal Stream alive on a dedicated thread, controlled by `AtomicBool`.
4. Store recordings in `<app_data_dir>/recordings/` folder (created automatically).
5. Register 3 commands + `RecordingState` managed state in `lib.rs`.

**Implementation notes:**
- WAV format: 16-bit PCM, device's native sample rate and channel count.
- Handles both F32 and I16 sample formats from cpal (F32 is most common on Windows WASAPI).
- `RecordingState = Mutex<Option<ActiveRecording>>` persists across start/stop calls.
- cpal 0.17: `device.name()` deprecated but still functional; `sample_rate()` returns `u32` directly.
- Temporary `AudioTest.tsx` component added to ShellLayout for verification (to be removed in Phase 3.2).

**Verification:**
- [x] Calling `invoke('list_audio_devices')` from the frontend returns a list of input devices.
- [x] Calling `invoke('start_recording')` and then `invoke('stop_recording')` after 5 seconds produces a valid WAV file.
- [x] The WAV file plays correctly in any audio player.
- [x] The returned duration is approximately correct (e.g., 5 seconds ± 0.5).
- [x] Recording does not block the UI thread.

---

### 3.2 — Groq API Transcription — COMPLETE (2026-03-02)

**Goal:** Add speech-to-text transcription via Groq API (Whisper v3 large). Replaced original offline Whisper plan — no CMake/LLVM build deps, no 150MB model download, faster and better quality.

**Steps:**

1. Added `reqwest 0.12` (multipart + json features) to `Cargo.toml`.
2. Created `src-tauri/src/commands/transcription.rs` with 3 commands:
   - `save_groq_api_key` — saves API key to `app_settings` table.
   - `get_groq_api_key` — reads API key from `app_settings` table.
   - `transcribe_audio(path, language)` — reads WAV file, POSTs multipart to Groq API (`whisper-large-v3`), returns transcription text. Includes punctuation prompt trick for 5 languages (en/it/es/fr/de). Emits `transcription:started` and `transcription:completed` Tauri events.
3. Registered commands in `lib.rs` and `commands/mod.rs`.
4. Extended `AudioTest.tsx` with: API key input + save, language selector, transcribe button, result display.

**Verification:**
- [x] `pnpm tauri dev` compiles without errors.
- [x] Saving Groq API key works.
- [x] `invoke('transcribe_audio', { path, language: 'en' })` returns transcribed text for clear English speech.
- [x] Transcription completes within a few seconds.
- [x] The UI remains responsive during transcription (not blocking).
- [x] Italian transcription with language="it" produces correct text with punctuation.
- [x] Missing API key shows appropriate error message.
- [x] Invalid API key shows "Invalid Groq API key" error.

**Known change from original plan:** Using Groq API instead of offline whisper-rs. No model download needed, just an API key.

---

### 3.3 — Voice Recorder Widget (Compact View) — COMPLETE (2026-03-02)

**Goal:** Build the compact view with record/stop button and last transcription preview.

**Steps:**

1. Created `src/widgets/voice-recorder/manifest.json` (id: `voice-recorder`, icon: `Mic`, grid: 2x3 default, permissions: database/filesystem, hasRustModule: true, settings: groqApiKey (password type) + language (select)).
2. Created `VoiceRecorderCompact.tsx`:
   - State machine: `idle` → `recording` → `transcribing` → `idle`.
   - Large circular record button (mic icon idle, square stop icon when recording with pulsing red ring animation via `motion`).
   - Recording timer counts up in MM:SS format.
   - Last transcription preview at bottom (loaded from `ctx.db` on mount).
   - Status bar: "Ready" / "Recording..." / "Transcribing..." / "Error".
   - Auto-copy transcription to clipboard after completion.
3. Created `VoiceRecorderExpanded.tsx` placeholder for Phase 3.4.
4. Created `config.ts` with widget registration, added import in `main.tsx`.
5. Groq API key management:
   - Added `password` type to `SettingSchema` in `types.ts`.
   - Widget settings show "API key already configured" + "Change" button when key exists.
   - Key synced bidirectionally: widget settings ↔ Rust backend (`app_settings` table).
6. Removed temporary `AudioTest.tsx` from ShellLayout (was from Phase 3.1/3.2).

**Verification:**
- [x] The widget shows a record button in its default state.
- [x] Pressing record starts the microphone capture (verify with system audio indicators).
- [x] The recording timer counts up accurately.
- [x] Pressing stop triggers transcription and shows the "Transcribing..." state.
- [x] The transcribed text appears in the widget after processing.
- [x] The `voice:transcription_ready` event is emitted with the correct text.
- [x] Recording and transcription data persist across restarts.
- [x] Groq API key persists across app restarts.
- [x] Settings dialog shows "API key already configured" when key is set.
- [x] Transcription text auto-copied to clipboard.
- [x] Missing API key shows inline warning message.

**Known additions beyond original plan:** Password setting type for API keys, clipboard auto-copy, bidirectional API key sync between widget settings and Rust backend.

---

### 3.4 — Voice Recorder Widget (Expanded View) — COMPLETE (2026-03-02)

**Goal:** Full recording management with playback, editing, and export.

**Steps:**

1. Created `src/widgets/voice-recorder/types.ts` — shared types (`VoiceRecording`, `RecordingResult`, `TranscriptionResult`) and utilities (`formatDuration`, `formatDate`, `formatTime`) extracted from compact view to eliminate duplication.
2. Created full `VoiceRecorderExpanded.tsx`:
   - **Recordings list:** scrollable list (newest first) of all recordings with date/time, duration badge, transcription text, and action buttons.
   - **Audio playback:** play/pause toggle per recording. Uses Rust `read_audio_base64` command → data URL → HTML5 `Audio`. Only one recording plays at a time.
   - **Transcription editing:** click pencil icon (hover-reveal) → inline textarea with save/cancel buttons. Changes persisted to SQLite.
   - **Delete recording:** 2-step confirmation (click trash → Confirm/Cancel). Deletes both WAV file (via Rust `delete_recording_file` command) and database entry.
   - **Retry transcription:** for recordings with empty transcription, shows warning icon + "Retry" button that calls Groq API.
   - **Search:** real-time filter by transcription text content. Recording count updates dynamically.
   - **Copy to clipboard:** per-recording copy button for transcription text.
   - **Empty state:** dedicated message for no recordings vs no search results.
3. Added Rust commands in `audio.rs`:
   - `read_audio_base64(path)` — reads WAV file and returns base64-encoded string (avoids `@tauri-apps/plugin-fs` scope issues with absolute paths on Windows).
   - `delete_recording_file(path)` — removes WAV file from disk.
4. Added `base64 = "0.22"` to `Cargo.toml`.
5. Applied 3x mic gain to F32 recording path for louder capture on Windows.
6. Updated `VoiceRecorderCompact.tsx` to import shared types from `types.ts`.

**Verification:**
- [x] Expanded view lists all past recordings chronologically.
- [x] Clicking play plays the audio correctly.
- [x] Transcription text can be edited and saved.
- [x] Recordings can be deleted (both DB entry and audio file).
- [x] Search filters recordings by transcription content.

**Known additions beyond original plan:** Retry transcription for failed recordings, 2-step delete confirmation, per-recording clipboard copy, mic gain boost (3x), shared types.ts to reduce duplication between compact/expanded views.

---

### 3.5 — Voice → Tasks Integration

**SKIPPED** — Removed on 2026-03-02. Auto-creating tasks from voice transcriptions adds complexity with limited practical value. Users can manually copy transcriptions to tasks via clipboard. May revisit in a future phase.

---

### 3.6 — Generic Web Widget (Iframe) — COMPLETE (2026-03-02)

**Goal:** Embed an external website in a widget using an inline `<iframe>` element.

**Steps:**

1. Create `src/widgets/web-widget/manifest.json` — type: `"web"`, icon: `Globe`, grid constraints (minW 2, minH 2, maxW 12, maxH 8, defaultW 4, defaultH 3), settings: `url` (string, default `https://example.com`).
2. Create `WebWidgetCompact.tsx`:
   - Render an `<iframe>` that fills the card content area (`w-full h-full border-0`).
   - Set `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"` for security.
   - Read URL from `ctx.settings.get('url')` with `normalizeUrl()` helper that auto-prefixes `https://` if missing.
   - Show loading spinner while iframe loads (`onLoad` event).
   - Bottom bar always visible: truncated URL display + "Open in browser" icon link (ExternalLink) as fallback for sites that block iframes.
   - Listen for settings changes via `onSettingsChange` to update the iframe `src`.
3. Create `WebWidgetExpanded.tsx` — placeholder for Phase 3.7.
4. Create `config.ts` — standard widget registration.
5. Register in `main.tsx`.

**Architecture decision:** Originally planned with separate Tauri `WebviewWindow` instances, but switched to inline `<iframe>` elements. The WebviewWindow approach was fragile (coordinate tracking, z-ordering, IPC overhead) and non-scalable. Iframes are simple, inline in the DOM, and scale to any number of widgets. Trade-off: some sites block iframe embedding, but most work fine.

**Verification:**
- [x] Adding a Web Widget from the catalog shows the configured URL inside the widget card.
- [x] The website is fully interactive (can click links, scroll, fill forms).
- [x] Dragging/resizing the widget works — the iframe follows automatically (it's inline DOM).
- [x] Removing the widget works cleanly.
- [x] Changing URL in settings navigates to the new URL.
- [x] Adding 2+ web widgets works independently.
- [x] URL without `https://` prefix is auto-normalized (e.g., `wikipedia.org` → `https://wikipedia.org`).
- [x] Bottom bar with URL and "Open in browser" link always visible as fallback.

**Known issues:** Sites that block iframes (Google, Twitter) show a blank frame — user can click "Open in browser" as fallback. Cannot detect iframe blocking client-side.

---

### 3.7 — Web Widget Enhanced View and Toolbar — COMPLETE (2026-03-03)

**Goal:** Add a compact toolbar and expanded view for the web widget.

**Steps:**

1. Added thin toolbar inside `WebWidgetCompact.tsx` above the iframe:
   - Refresh button (reloads iframe by toggling a `refreshKey` state).
   - "Open in browser" button (opens URL in system default browser via `tauri-plugin-opener` `openUrl()`).
   - URL display (read-only, truncated, muted text).
2. Implemented `WebWidgetExpanded.tsx`:
   - Full-page iframe view with negative margin to fill parent padding.
   - Toolbar with: refresh, open in browser, URL display (slightly larger than compact).
   - Listens for settings changes to update URL dynamically.
3. Set `hasExpandedView: true` in manifest.
4. Extracted `normalizeUrl()` into shared `utils.ts` to eliminate duplication between compact/expanded views.
5. Removed old bottom bar from compact view — replaced by the toolbar at top.

**Verification:**
- [x] Refresh button reloads the iframe content.
- [x] "Open in browser" opens the URL in the default system browser.
- [x] Expanding the web widget shows a full-page iframe view.
- [x] URL display shows the current configured URL.

---

### 3.8 — Web Widget Error Handling — COMPLETE (2026-03-03)

**Goal:** Detect and handle sites that block iframe embedding.

**Steps:**

1. Implemented iframe load timeout detection (8s) in both `WebWidgetCompact.tsx` and `WebWidgetExpanded.tsx`:
   - `onLoad` event clears timeout and marks success.
   - If no `onLoad` fires within 8 seconds, shows error state with warning icon, message ("This site may block embedding"), and "Open in browser" button.
   - Refresh and URL change reset the error state.
2. Added `.grid-dragging iframe { pointer-events: none }` CSS rule in `index.css`.
3. Added `isDragging` state to `WidgetGrid.tsx` — toggled by `onDragStart`/`onDragStop` and `onResizeStart`/`onResizeStop` callbacks — applies `grid-dragging` class to container.
4. Tested: Wikipedia (works), Google (blocked → error state shown).

**Verification:**
- [x] Sites that allow iframes load and display correctly.
- [x] Sites that block iframes show an error state with "Open in browser" option.
- [x] Dragging the widget card works smoothly (iframe doesn't steal mouse events).
- [x] No console errors or unhandled promise rejections.

---

### 3.9 — Phase 3 Integration Testing — COMPLETE (2026-03-03)

**Goal:** Full integration test of all Phase 3 features.

**Steps:**

1. Full scenario tested:
   - Dashboard with: Daily Tasks, Craving Control, Voice Recorder, and two Web Widgets (Wikipedia + docs site).
   - Voice recording → transcription completes → text copied to clipboard.
   - Craving resisted → notification shown → Daily Tasks auto-completes health task.
   - Web widgets interactive — navigation, scrolling, forms all work.
   - Rearranged all widgets → layout persists after restart.
2. Performance testing:
   - Memory usage under 200MB with 2 web widget iframes active.
   - Grid drag smooth at 60fps with all widgets loaded (pointer-events overlay prevents iframe mouse capture).
   - App startup under 3 seconds with all widgets.
3. Stress test passed: multiple widget instances stable.

**Verification:**
- [x] All five widgets work simultaneously without conflicts.
- [x] Inter-widget events flow correctly across all widgets.
- [x] Memory usage is under 200MB with 2 web widget iframes.
- [x] No UI glitches or layout bugs.
- [x] App starts in under 3 seconds with all widgets.

---

## PHASE 4 — POLISH & EXPAND

Phase 4 focuses on UX refinements, performance optimization, and additional utilities.

---

### 4.1 — Command Palette — COMPLETE (2026-03-03)

**Goal:** Implement a `/` key command palette for quick actions.

**Steps:**

1. Added shadcn `Command` component (cmdk-based) via `pnpm dlx shadcn@latest add command`.
2. Created `CommandPalette.tsx` in `src/components/shell/`:
   - Opens on `/` key press (when no input/textarea is focused) or `Ctrl+K` (toggle).
   - Grouped actions: Dashboards (switch), Add Widget (all registered widgets), Open Widget (expandable widgets on grid), Appearance (toggle theme).
   - Each action has a Lucide icon. Dashboard actions show `Ctrl+1-9` shortcut hints.
   - `/` skipped when input, textarea, or contentEditable is focused.
3. Wired all actions: `setActiveDashboard`, `addWidget`, `expandWidget`, and dark/light theme toggle via `classList.toggle('dark')`.
4. Added `<CommandPalette />` to `ShellLayout.tsx`.

**Verification:**
- [x] Pressing `/` opens the command palette.
- [x] Typing filters actions in real time.
- [x] Selecting "Switch to Work dashboard" switches correctly.
- [x] Selecting "Add Daily Tasks" adds the widget.
- [x] Escape closes the palette.

---

### 4.2 — Keyboard Shortcut Customization — COMPLETE (2026-03-03)

**Goal:** Allow users to customize all keyboard shortcuts.

**Steps:**

1. Added generic `get_app_setting` and `save_app_setting` Rust commands for the `app_settings` table (reusable key-value store).
2. Created `shortcuts-store.ts` (zustand):
   - 15 default shortcuts (General: command palette, add widget, settings, toggle sidebar, close panel; Dashboards: Ctrl+1-9).
   - `load()` reads custom bindings from SQLite `app_settings` table (`keyboard_shortcuts` key).
   - `rebind(id, binding)`, `reset(id)`, `resetAll()` — all persist to SQLite.
   - `matchesBinding(event, binding)` utility for matching keyboard events to binding strings.
3. Created `AppSettingsDialog.tsx` — "Keyboard Shortcuts" dialog opened from sidebar settings icon:
   - Grouped by category (General, Dashboards).
   - Click a binding → "Press keys..." recording mode → press key combo → saves.
   - Escape cancels recording without changing.
   - Conflict detection: if binding already used, shows red warning and rejects.
   - Per-shortcut reset button (appears when modified). "Reset All to Defaults" button.
4. Wired sidebar settings gear icon to open `AppSettingsDialog`.
5. Updated `CommandPalette.tsx` to read bindings from shortcuts store instead of hardcoded keys.
6. Shortcuts store loaded at app startup in `ShellLayout.tsx`.

**Verification:**
- [x] All shortcuts are listed with current bindings.
- [x] Rebinding works and takes effect immediately.
- [x] Conflicts are detected and warned.
- [x] Custom bindings persist across restarts.

---

### 4.3 — Theme Customization — COMPLETE (2026-03-03)

**Goal:** Polish the theme toggle and ensure all widgets look correct in both modes.

**Note:** Both dark and light mode CSS variables are already configured in `index.css` from Phase 1.1 (shadcn/ui generates both by default with OKLCH values). This phase focuses on the toggle UI and thorough visual testing.

**Steps:**

1. Created `theme-store.ts` (zustand) with `light`/`dark`/`system` modes:
   - `load()` reads persisted theme from `app_settings` table and applies it.
   - `setTheme(theme)` applies immediately and persists to SQLite.
   - `applyTheme()` toggles `.dark` class on `<html>` based on mode.
   - Listens for `prefers-color-scheme` changes — auto-updates when in "system" mode.
2. Added `ThemeToggle` button in sidebar (above settings gear):
   - Cycles: Dark (Moon icon) → Light (Sun icon) → System (SunMoon icon).
   - Tooltip shows current mode: "Theme: Dark" / "Theme: Light" / "Theme: System".
3. Theme store loaded at startup in `ShellLayout.tsx`.
4. Updated `CommandPalette.tsx` — "Appearance" group now shows 3 separate options (Light mode, Dark mode, System theme) instead of a single toggle.
5. All widgets verified correct in both light and dark modes.

**Verification:**
- [x] Switching to light mode updates the entire app immediately.
- [x] All widgets render correctly in light mode (no invisible text, broken contrast).
- [x] "System" mode follows the Windows theme setting.
- [x] Theme preference persists across restarts.

---

### 4.4 — Performance Optimization — COMPLETE (2026-03-03)

**Goal:** Optimize for smooth operation with many widgets.

**Steps:**

1. **Widget lazy loading:** Created `LazyWidget.tsx` wrapper using `IntersectionObserver` with 200px rootMargin. Widgets outside viewport show "Loading..." placeholder until first intersection. Once visible, stays mounted to preserve state. Integrated into `WidgetGrid.tsx`.
2. **Iframe throttling:** Handled by LazyWidget — web widget iframes in off-screen cards are not mounted until scrolled into view.
3. **Event bus optimization:** Added debouncing (100ms) for high-frequency events (`task:completed`, `craving:resisted`). Added max listener warning (20 per event) to detect memory leaks early.
4. **Database query batching:** Added per-widget data cache in `context.ts`. On first `db.get()`, all rows for the widget are fetched in a single query and cached in-memory. Subsequent reads hit cache. `db.set()` and `db.delete()` update cache inline.
5. **React optimization:** `WidgetCard` already uses `React.memo` (from Phase 1). Context creation uses `useMemo`.

**Verification:**
- [x] A dashboard with 15 widgets loads in under 3 seconds.
- [x] Scrolling through a dashboard with off-screen widgets is smooth (60fps).
- [x] Memory usage remains stable (no leaks) after switching dashboards 20 times.
- [x] Unmounted web widget iframes do not consume CPU.

---

### 4.5 — Error Boundaries and Resilience — COMPLETE (2026-03-03)

**Goal:** Ensure widget errors are gracefully contained.

**Steps:**

1. Created `WidgetErrorBoundary.tsx` — React class component Error Boundary:
   - Catches render errors in children via `getDerivedStateFromError` + `componentDidCatch`.
   - Displays friendly error card: warning icon, widget name, error message (truncated), "Reload" button (re-mounts widget), "Remove" button (removes from grid).
   - Logs errors to console with `[WidgetErrorBoundary]` prefix and component stack.
2. Wrapped `CompactView` in `WidgetCard.tsx` with `WidgetErrorBoundary` — "Remove" triggers `removeWidget`.
3. Wrapped `ExpandedView` in `GridArea.tsx` with `WidgetErrorBoundary` — "Remove" triggers `collapseWidget` (returns to grid).
4. Shell remains fully functional when a widget is in error state.

**Verification:**
- [x] A widget that throws an error shows the error card instead of crashing the app.
- [x] Clicking "Reload" re-mounts the widget and clears the error.
- [x] Other widgets are completely unaffected by one widget's error.
- [x] The error is logged for debugging.

---

### 4.6 — Backup and Export

**Goal:** Allow the user to export and import their entire app configuration and data.

**Steps:**

1. Create an "Export" option in app settings:
   - Packages the SQLite database + app settings into a single `.zip` file.
   - User chooses the save location via a native file picker.
2. Create an "Import" option:
   - Reads a `.zip` export file.
   - Replaces the current database (with confirmation).
   - Reloads the app to reflect imported data.
3. Add an "Auto-backup" option: save a backup to a configured directory on app quit (daily).

**Verification:**
- [ ] Export creates a valid `.zip` file containing the database.
- [ ] Import restores dashboards, widgets, tasks, craving history, and settings correctly.
- [ ] Import warns before overwriting existing data.
- [ ] Auto-backup creates a timestamped backup file on app quit.

---

### 4.7 — App Autostart

**Goal:** Optionally launch Everything App on Windows startup.

**Steps:**

1. Add a setting: "Start with Windows" (default: false).
2. Use `tauri-plugin-autostart` to register/unregister the app from Windows startup.
3. When starting at boot, start minimized to tray (don't open the window).

**Verification:**
- [ ] Enabling the setting adds the app to Windows startup.
- [ ] After reboot, the app is running in the system tray.
- [ ] Disabling the setting removes it from startup.

---

### 4.8 — Phase 4 Integration Testing and Release Preparation

**Goal:** Final comprehensive testing and preparation for daily use.

**Steps:**

1. Complete end-to-end test of the full app with all widgets, features, and settings.
2. Build the production binary with `pnpm tauri build`.
3. Verify the binary size (target: under 15MB excluding Whisper model).
4. Install the built app and test outside the development environment.
5. Measure cold start performance on the production build.
6. Create a simple README documenting how to build, develop, and add new widgets.

**Verification:**
- [ ] Production build completes without warnings.
- [ ] The installed app works identically to the dev build.
- [ ] Binary size is under 15MB.
- [ ] Cold start is under 2 seconds.
- [ ] All widgets, event bus, web widget iframes, hotkeys, tray, and notifications work in the production build.
- [ ] The README accurately describes the project setup and widget development process.
