# Everything App — Product Requirements Document

**Version:** 1.1
**Date:** March 1, 2026
**Status:** Draft — Updated with verified dependency versions and architectural decisions

---

## 1. Executive Summary

Everything App is a modular desktop application for Windows that serves as a personal productivity and wellbeing dashboard. The application allows the user to create, configure, and arrange custom widgets on a drag-and-drop grid, centralizing daily tasks, automations, and tools into a single native interface.

The app is built on Tauri 2.x (Rust backend + React/TypeScript frontend), ensuring native performance, a lightweight footprint, and full access to system-level capabilities such as microphone input, file system, and notifications.

The core philosophy is **progressive modularity**: start with a solid shell and a few essential widgets, then expand the ecosystem incrementally by adding new widgets over time — each one self-contained, independently developed, and interconnected through a shared event system.

---

## 2. Problem Statement

Daily workflows involve constant context-switching between disparate tools: task managers, calendars, note-taking apps, voice recorders, web dashboards, health and habit trackers, and more. Each tool has its own interface, its own data silo, and its own notification system.

This fragmentation leads to:

- Lost time switching between applications.
- Difficulty maintaining a holistic view of daily priorities.
- No ability to create custom micro-tools tailored to personal needs.
- No interconnection between tools (e.g., a voice note can't automatically become a task).

Everything App solves this by providing a single, extensible desktop environment where custom widgets can coexist, communicate, and be tailored precisely to the user's workflow.

---

## 3. Goals and Non-Goals

### 3.1 Goals

- Deliver a lightweight, native-feeling Windows desktop app with fast startup and low memory usage.
- Provide a drag-and-drop widget grid system with persistent layout.
- Define a Widget SDK that makes it straightforward to develop, register, and load new widgets.
- Enable inter-widget communication through an event bus and shared state, so widgets can react to each other without tight coupling.
- Support both native widgets (React components with optional Rust backend modules) and web widgets (embedded external websites via inline `<iframe>` elements).
- Include a system tray icon so the app stays accessible when minimized.
- Support multiple dashboards (e.g., "Work", "Health", "Personal") that the user can switch between.

### 3.2 Non-Goals (for v1)

- Cloud sync or multi-device support.
- A public widget marketplace or third-party plugin distribution.
- Mobile or macOS versions.
- Collaborative/multi-user features.
- AI-powered automation (may be explored in future versions).

---

## 4. Target User

The primary user is the developer/creator of the app (dogfooding). The app is designed as a personal tool, built for one, with the architecture flexible enough to potentially serve a broader audience in the future.

**User profile:**

- Power user comfortable with customizing tools.
- Works on Windows daily.
- Juggles multiple workflows: development, personal productivity, health habits.
- Values speed, keyboard shortcuts, and minimal friction.
- Wants a single place to see and control everything.

---

## 5. Technology Stack

### 5.1 Framework

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Desktop framework | Tauri 2.10.x | Native performance, small binary size (~5-10 MB vs 150+ MB Electron), system-level access via Rust |
| Frontend | React 18.3.1 + TypeScript | Component-based architecture ideal for widgets, strong typing, large ecosystem. React 18 chosen over 19 for react-grid-layout compatibility. |
| Backend | Rust 1.93.x stable | Memory safety, high performance, direct access to OS APIs (audio, filesystem, notifications) |
| Bundler | Vite 7.x | Fast HMR in development, optimized production builds |
| Package manager | pnpm 9.x | Fast, disk-efficient. v9 preferred over v10 to avoid lifecycle scripts breaking change. |

### 5.2 Key Libraries — Frontend

| Library | Purpose |
|---------|---------|
| `shadcn/ui` | Component system built on Radix UI primitives + Tailwind. Not an npm dependency — components are copied into the project for full ownership and customization. Provides: Dialog, DropdownMenu, Card, Button, Input, Checkbox, Tabs, Tooltip, Toast, Slider, Command Palette, and more. |
| `radix-ui` | Headless, accessible UI primitives (underlying foundation of shadcn/ui components) |
| `tailwindcss` v4.x | Utility-first CSS for rapid, consistent styling; powers all shadcn/ui theming. v4 uses CSS-first configuration via `@theme` directive — no `tailwind.config.ts` file. Uses `@tailwindcss/vite` plugin instead of PostCSS. |
| `tw-animate-css` | CSS animation utilities for shadcn/ui (replaces deprecated `tailwindcss-animate`) |
| `class-variance-authority` (CVA) | Variant management for shadcn components (size, color, state variants) |
| `clsx` + `tailwind-merge` | Class name utilities for conditional and conflict-free Tailwind class composition |
| `react-grid-layout` v2.x | Drag-and-drop grid with resize, collision handling, layout persistence. v2 is a full TypeScript rewrite with built-in types (no `@types/react-grid-layout` needed). |
| `zustand` v5.x | Lightweight global state management for shared state and widget communication. Note: v5 requires `useShallow` from `zustand/react/shallow` for object selectors to avoid infinite re-render loops. |
| `motion` (formerly `framer-motion`) | Animations for widget transitions, breathing exercises, UI feedback. Import from `"motion/react"`, not `"framer-motion"`. |
| `lucide-react` | Icon set (default icon library for shadcn/ui) |

**shadcn/ui usage across the app:**

The entire UI is built on shadcn/ui components (New York style) for visual consistency. The shell uses Card for widget containers, Dialog for modals and settings, DropdownMenu for context menus, Tabs for dashboard navigation, Command for the command palette, and Toast for inline notifications. Widgets themselves use the same component library internally, ensuring a unified look and feel. Theming (colors in OKLCH format, border radius, font, dark/light mode) is configured once globally and inherited by all components via Tailwind CSS variables in `index.css` using the `@theme inline` directive.

### 5.3 Key Libraries — Backend (Rust)

| Library / Plugin | Purpose |
|-----------------|---------|
| `tauri-plugin-sql` + SQLite | Local persistent storage for all widget data |
| `tauri-plugin-notification` | Native Windows notifications |
| `tauri-plugin-autostart` | Launch app at Windows startup |
| `tauri-plugin-global-shortcut` | System-wide keyboard shortcuts |
| `tauri-plugin-fs` | File system access |
| `cpal` | Audio capture from microphone |
| `whisper-rs` | Offline speech-to-text transcription (Whisper.cpp bindings) |
| `tokio` | Async runtime for non-blocking backend operations |
| `serde` + `serde_json` | Serialization/deserialization between frontend and backend |

### 5.4 Development Tooling

- ESLint + Prettier for code formatting and linting.
- Rust Analyzer for Rust IDE support.
- Tauri CLI for development builds, hot reload, and packaging.

---

## 6. Application Architecture

### 6.1 High-Level Architecture

The application is structured in three layers:

**Layer 1 — Shell (the host application):**
The shell is the main window. It owns the top bar, sidebar, widget grid area, settings panel, and widget catalog. It is responsible for loading widgets, managing layout state, providing global services (database, event bus, notifications), and handling navigation between dashboards.

**Layer 2 — Widget Runtime:**
Each widget is loaded as an isolated React component inside the grid. The runtime provides every widget with a `WidgetContext` object containing the APIs it is allowed to use. Widgets do not reference each other directly; they communicate exclusively through the runtime's event bus and shared state.

**Layer 3 — Rust Backend:**
The Tauri backend handles all system-level operations: database access, microphone capture, file I/O, and notifications. Widgets access backend functionality through Tauri's `invoke` command system. Each widget can optionally declare a Rust module for custom backend logic.

### 6.2 Data Flow

```
┌─────────────────────────────────────────────┐
│                   Shell                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │Widget A │  │Widget B │  │Widget C │     │
│  │ (React) │  │ (React) │  │(iframe) │     │
│  └────┬────┘  └────┬────┘  └────┬────┘     │
│       │             │             │          │
│  ┌────▼─────────────▼─────────────▼────┐    │
│  │         Widget Runtime              │    │
│  │  ┌──────────┐  ┌───────────────┐    │    │
│  │  │Event Bus │  │ Shared State  │    │    │
│  │  └──────────┘  └───────────────┘    │    │
│  └─────────────────┬───────────────────┘    │
│                    │ invoke()                │
└────────────────────┼────────────────────────┘
                     │
┌────────────────────▼────────────────────────┐
│             Rust Backend (Tauri)             │
│  ┌────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ SQLite │ │  Audio   │ │  File System │  │
│  │   DB   │ │ Capture  │ │   & Others   │  │
│  └────────┘ └──────────┘ └──────────────┘  │
└─────────────────────────────────────────────┘
```

### 6.3 Inter-Widget Communication

Three complementary mechanisms enable widget interconnection:

**6.3.1 Event Bus (real-time, fire-and-forget)**

The primary communication channel. Any widget can emit a named event with a typed payload. Any other widget can subscribe to events it cares about. Widgets remain fully decoupled: they don't know who emits or who listens.

Event naming convention: `<domain>:<action>`, e.g.:
- `craving:resisted` — emitted when the user completes a craving exercise.
- `task:completed` — emitted when a task is checked off.
- `voice:transcription_ready` — emitted when a voice recording has been transcribed.

Example flow:
1. User completes a breathing exercise in the Craving Widget.
2. Craving Widget emits `craving:resisted` with payload `{ timestamp, duration, type }`.
3. Daily Tasks Widget listens for `craving:resisted` and auto-checks a recurring "manage craving" task.
4. A future Statistics Widget listens for the same event and logs it to a chart.

**6.3.2 Shared State (persistent, read/write)**

A Zustand-based global store with namespaced sections. Each section is owned by a specific widget (write access) but readable by any widget that declares the dependency in its manifest.

Use cases:
- The Daily Tasks widget writes today's task list; a Calendar Overview widget reads it.
- User preferences (theme, language) are stored in a global section accessible to all widgets.

**6.3.3 Rust Backend Services (system-level, request/response)**

For operations that cross widget boundaries at the system level, such as database queries, audio processing, or file operations. Communication follows a request/response pattern via Tauri `invoke`.

Example: Voice Widget calls `invoke('save_transcription', { text, timestamp })` → Rust writes to SQLite → Daily Tasks Widget later calls `invoke('get_recent_transcriptions')` to suggest new tasks from voice notes.

---

## 7. Widget SDK Specification

### 7.1 Widget Structure

Every widget is a self-contained module with the following structure:

```
widgets/
  craving-widget/
    manifest.json          # Widget metadata and configuration
    CravingWidget.tsx      # Main React component
    CravingCompact.tsx     # Compact view for the grid
    CravingExpanded.tsx    # Expanded full-page view (optional)
    craving.module.rs      # Rust backend module (optional)
    styles.css             # Widget-specific styles (optional)
    config.ts              # Default settings schema
```

### 7.2 Widget Manifest

```json
{
  "id": "craving-widget",
  "name": "Craving Control",
  "description": "Breathing exercises and tracking to manage cravings",
  "version": "1.0.0",
  "icon": "wind",
  "type": "native",
  "grid": {
    "defaultWidth": 2,
    "defaultHeight": 2,
    "minWidth": 2,
    "minHeight": 2,
    "maxWidth": 4,
    "maxHeight": 4
  },
  "permissions": [
    "notifications",
    "database"
  ],
  "events": {
    "emits": ["craving:started", "craving:resisted", "craving:failed"],
    "listens": ["task:completed"]
  },
  "sharedState": {
    "reads": ["tasks:today"],
    "writes": ["craving:stats"]
  },
  "hasExpandedView": true,
  "hasRustModule": false,
  "settings": {
    "breathingDuration": {
      "type": "number",
      "default": 60,
      "label": "Breathing exercise duration (seconds)"
    },
    "enableNotifications": {
      "type": "boolean",
      "default": true,
      "label": "Enable craving reminder notifications"
    }
  }
}
```

### 7.3 Web Widget Manifest

For widgets that embed external websites via `<iframe>`:

```json
{
  "id": "web-widget",
  "name": "Web Widget",
  "description": "Embed any website in a dashboard widget",
  "icon": "Globe",
  "type": "web",
  "grid": {
    "minW": 2,
    "minH": 2,
    "maxW": 12,
    "maxH": 8,
    "defaultW": 4,
    "defaultH": 3
  },
  "permissions": [],
  "events": { "emits": [], "listens": [] },
  "sharedState": { "reads": [], "writes": [] },
  "hasExpandedView": false,
  "hasRustModule": false,
  "settings": {
    "url": { "type": "string", "label": "Website URL", "default": "https://example.com" }
  }
}
```

**Known limitation:** Some sites block iframe embedding via `X-Frame-Options` or CSP `frame-ancestors` headers (e.g., Google, Twitter). These sites will show an error. The majority of websites, documentation sites, dashboards, and tools work correctly.

### 7.4 WidgetContext API

Every widget receives a `WidgetContext` object from the runtime:

```typescript
interface WidgetContext {
  // Widget identity
  widgetId: string;

  // Event Bus
  emit: (event: string, payload?: any) => void;
  on: (event: string, callback: (payload: any) => void) => UnsubscribeFn;

  // Database
  db: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    query: (table: string, filter?: object) => Promise<any[]>;
    delete: (key: string) => Promise<void>;
  };

  // Shared State
  sharedState: {
    read: (namespace: string) => any;
    write: (namespace: string, value: any) => void;
    subscribe: (namespace: string, callback: (value: any) => void) => UnsubscribeFn;
  };

  // Settings
  settings: {
    get: (key: string) => any;
    set: (key: string, value: any) => Promise<void>;
    getAll: () => Record<string, any>;
  };

  // System
  notify: (title: string, body: string, options?: NotificationOptions) => void;
  invoke: (command: string, args?: object) => Promise<any>;
}
```

---

## 8. User Interface Design

### 8.1 Layout Structure

```
┌──────────────────────────────────────────────┐
│  ┌──┐  Everything App          [⚙] [—][□][×]│
│  │≡ │  Dashboard: Work                       │
├──┼──┼────────────────────────────────────────┤
│  │🏠│                                        │
│  │  │  ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │📋│  │  Widget  │ │  Widget  │ │ Widget │ │
│  │  │  │    A     │ │    B     │ │   C    │ │
│  │🫁│  │          │ │          │ │        │ │
│  │  │  └──────────┘ └──────────┘ └────────┘ │
│  │🎙│                                        │
│  │  │  ┌──────────────────────┐ ┌──────────┐ │
│  │🌐│  │      Widget D       │ │  Widget  │ │
│  │  │  │                     │ │    E     │ │
│  │  │  │                     │ │          │ │
│  │⚙│  └──────────────────────┘ └──────────┘ │
│  │  │                                        │
│  └──┘                                        │
└──────────────────────────────────────────────┘
```

**Sidebar (left):** Thin icon-based sidebar for switching between dashboards, accessing widget catalog, and opening settings. Collapsible.

**Top bar:** Displays current dashboard name, "Add Widget" button, and window controls.

**Grid area (center):** The main content area. Contains the drag-and-drop widget grid. Scrollable if widgets exceed the viewport.

### 8.2 Widget Interaction Model

**Dual-view system:**

Each native widget can declare two views:
- **Compact View** — displayed in the grid card. Shows essential information and primary controls. Suitable for quick interactions.
- **Expanded View** — full-page view that replaces the grid. Used for detailed interactions, long lists, comprehensive settings. Activated by clicking an expand button or double-clicking the widget. A back button returns to the grid.

If a widget does not declare an expanded view, the expand button is not shown.

**Widget card chrome:**

Every widget in the grid is wrapped in a standard shadcn `Card` component that provides:
- Title bar with widget name and icon (Lucide icon from manifest).
- Drag handle for repositioning.
- Expand button via shadcn `Button` variant ghost (if expanded view exists).
- Settings gear icon (opens widget-specific settings in a shadcn `Dialog`).
- Resize handle in the bottom-right corner.
- Context menu via shadcn `DropdownMenu` (right-click: remove widget, duplicate, reset settings).

### 8.3 Widget Catalog

A slide-in panel (from the right side, built with shadcn `Sheet`) that displays all available widgets organized by category. Each entry is a shadcn `Card` showing the widget icon, name, description, and an "Add to Dashboard" `Button`. Widgets can be filtered with a search input (`Input` component) at the top of the panel. Widgets can appear multiple times on a dashboard (e.g., multiple web widgets with different URLs).

**Categories:**
- Productivity (Tasks, Calendar, Notes)
- Health & Wellbeing (Craving Control, Pomodoro, Hydration)
- Media & Voice (Voice Recorder, Music Player)
- Web (Generic Web Widget, preconfigured widgets for Gmail, Calendar, etc.)
- System (CPU Monitor, Quick Launcher, Clipboard History)

### 8.4 System Tray

The app resides in the Windows system tray when minimized. Right-clicking the tray icon provides:
- Open app
- Quit

Left-clicking the tray icon toggles the main window visibility.

### 8.5 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | Add new widget |
| `Ctrl+,` | Open settings |
| `Ctrl+1-9` | Switch to dashboard 1-9 |
| `Escape` | Close expanded widget / close panels |
| `Ctrl+L` | Toggle sidebar |
| `/` | Open command palette (future enhancement) |

### 8.6 UI Component Mapping (shadcn/ui)

All UI elements are built on shadcn/ui components to ensure visual consistency, accessibility, and dark mode support across the entire application.

**Shell components:**

| UI Element | shadcn Component(s) |
|-----------|---------------------|
| Widget card wrapper | `Card`, `CardHeader`, `CardContent` |
| Widget settings modal | `Dialog`, `DialogContent`, `DialogHeader` |
| Widget context menu | `DropdownMenu` |
| Widget catalog panel | `Sheet` (slide-in from right) |
| Dashboard tabs in sidebar | `Tooltip` (for icon labels on collapsed sidebar) |
| Top bar "Add Widget" | `Button` |
| Settings panel | `Dialog` with `Tabs` for sections |
| Command palette | `Command` (cmdk-based) |
| Inline notifications | `Toast` / `Sonner` |
| Confirmation prompts | `AlertDialog` |
| Theme toggle | `Button` with `DropdownMenu` (light/dark/system) |

**Widget-internal components (available to all widgets via SDK):**

| Use Case | shadcn Component(s) |
|----------|---------------------|
| Task checkboxes | `Checkbox` |
| Task input | `Input` |
| Breathing timer slider | `Slider` |
| Craving statistics tabs | `Tabs`, `TabsContent` |
| Voice recording controls | `Button` (variants: default, destructive, outline) |
| Transcription list | `ScrollArea` |
| Date/time selection | `Calendar`, `Popover` |
| Craving history | `Table` |
| Settings forms | `Label`, `Input`, `Switch`, `Select` |
| Progress indicators | `Progress` |
| Stat summaries | `Badge` |

**Theming:**

shadcn/ui theming is configured via CSS variables in `index.css` using TailwindCSS v4's `@theme inline` directive. A single theme definition controls the entire app appearance. The theme includes: base colors in OKLCH format (background, foreground, card, popover, muted, accent, destructive), border radius, ring color for focus states, and separate variable sets for light and dark mode (`:root` for light, `.dark` for dark). Both dark and light modes are supported from v1, with system preference detection via `prefers-color-scheme` and a manual toggle. Dark mode is the default.

---

## 9. Data Persistence

### 9.1 SQLite Database

All application and widget data is stored locally in a single SQLite database file.

**Core tables:**

```
dashboards
  - id (TEXT, PK)
  - name (TEXT)
  - icon (TEXT)
  - sort_order (INTEGER)
  - created_at (DATETIME)

widget_instances
  - id (TEXT, PK)
  - widget_type (TEXT)           -- references the widget SDK id
  - dashboard_id (TEXT, FK)
  - grid_position (JSON)         -- {x, y, w, h}
  - settings (JSON)              -- widget-specific settings
  - created_at (DATETIME)
  - updated_at (DATETIME)

widget_data
  - id (TEXT, PK)
  - widget_instance_id (TEXT, FK)
  - key (TEXT)
  - value (JSON)
  - created_at (DATETIME)
  - updated_at (DATETIME)

events_log
  - id (INTEGER, PK, AUTOINCREMENT)
  - event_name (TEXT)
  - payload (JSON)
  - source_widget_id (TEXT)
  - timestamp (DATETIME)

app_settings
  - key (TEXT, PK)
  - value (JSON)
```

### 9.2 Data Ownership

Each widget reads and writes to the `widget_data` table, scoped by its own `widget_instance_id`. The Widget SDK's `db` methods automatically scope queries to prevent one widget from accidentally accessing another's data.

Shared data is exchanged only through the shared state mechanism (Zustand) or the event bus — never by direct cross-widget database access.

### 9.3 Backup and Export

The SQLite database file can be copied or backed up as a single file. Future versions may include an in-app export/import feature for dashboards and widget configurations.

---

## 10. Web Widget System

### 10.1 Overview

Web widgets embed external websites using standard HTML `<iframe>` elements rendered inline within the widget card's content area. This is the simplest, most scalable approach: iframes are part of the DOM, follow the grid layout automatically, require no coordinate tracking or IPC, and scale to any number of concurrent widgets.

### 10.2 Implementation Details

- Each web widget renders an `<iframe>` with `src` set to the configured URL.
- The iframe fills the widget card content area (100% width and height).
- The `sandbox` attribute is set to `allow-scripts allow-same-origin allow-forms allow-popups` for reasonable security defaults.
- URL changes via the settings dialog update the iframe `src` dynamically.
- No Rust backend involvement needed — the iframe is entirely frontend.

### 10.3 Known Constraints and Mitigations

| Constraint | Mitigation |
|-----------|-----------|
| Some sites block iframe embedding (`X-Frame-Options`, CSP `frame-ancestors`) | Show a clear error state with the option to open the URL in the system browser. Most documentation sites, dashboards, and tools work fine. |
| No session persistence across app restarts | Tauri's WebView2 manages its own cookie/storage context; sessions persist within the same app session and often across restarts. |
| No cross-origin event bus integration | Optional future enhancement: inject `postMessage` bridge for communication between iframe content and app event bus. |
| Iframe content cannot be inspected for navigation state | Toolbar with back/forward not feasible for cross-origin; provide a refresh button and "open in browser" fallback. |

---

## 11. Initial Widget Specifications

### 11.1 Daily Tasks Widget

**Purpose:** Manage and display daily tasks and events.

**Compact view:** Today's date, a list of tasks with checkboxes (category color dot + repeat icon for recurring), a quick-add input field, and "X/Y" completion counter.

**Expanded view:** Full task management with:
- **Clickable weekly overview with navigation** — browse weeks with `<`/`>` arrows, "Today" reset button. Click any day tile to view/add tasks for that day. Today always has a ring, selected day gets primary highlight.
- **Future date support** — date picker in add-task form, pre-filled with selected day. Tasks can be created for any date.
- **Category system** — Personal (blue), Work (amber), Health (green), Learning (purple). Color dots displayed on badges, tab triggers, and compact view.
- **Recurring tasks** — once/daily/weekly. Recurrence editable in the edit dialog. Daily/weekly tasks auto-generate on the target day when the app loads.
- **Edit dialog** — title, category (badge selector with color dots), recurrence (Once/Daily/Weekly badges), and notes.
- **Dynamic header** — shows "Today's Tasks" vs formatted date for other days.

**Shared state:** `tasks:today` always reports actual today's counts (total + completed), regardless of which day is selected in the expanded view.

**Known limitation:** Recurring task generation runs only for actual today on app load. Navigating to a future day will not preview pending recurring tasks — they generate when the day arrives.

**Events emitted:** `task:created`, `task:completed`, `task:deleted`.

**Events listened:** `voice:transcription_ready` (to suggest creating a task from voice input), `craving:resisted` (to auto-complete a "manage craving" recurring task).

**Data stored:** Tasks with fields: id, title, isCompleted, dueDate, createdAt, category (optional), notes (optional), recurring (optional: none/daily/weekly).

**Shared code:** Shared `types.ts` (Task interface, CATEGORIES, RECURRING_OPTIONS, CATEGORY_COLORS) and `utils.ts` (date helpers, recurring generation) eliminate duplication between compact/expanded views.

**Permissions:** `database`, `notifications`.

### 11.2 Craving Control Widget

**Purpose:** Help the user manage cravings (e.g., smoking) through breathing exercises, distraction techniques, and tracking.

**Compact view:** A large "I have a craving" button, current streak counter (days/cravings resisted), and a quick-stats summary.

**Expanded view:** Guided breathing exercise (animated circle that expands/contracts with configurable timing), craving history log, statistics (cravings per day/week, success rate, longest streak), and settings.

**Breathing exercise flow:**
1. User presses "I have a craving."
2. The widget logs the craving event and immediately starts a guided breathing exercise.
3. Animated visual guide: a circle expands (inhale 4s), holds (hold 4s), contracts (exhale 6s). Configurable timing.
4. After the configured number of cycles (default: 5), the exercise completes.
5. The widget asks: "Did the craving pass?" → Yes (logs `craving:resisted`) / No (offers another round or alternative distraction tips).

**Events emitted:** `craving:started`, `craving:resisted`, `craving:failed`.

**Events listened:** None initially.

**Data stored:** Craving events with fields: id, timestamp, duration, outcome (resisted/failed), notes.

**Permissions:** `database`, `notifications`.

### 11.3 Voice Recorder & Transcription Widget

**Purpose:** Record voice notes via microphone and transcribe them to text.

**Compact view:** Record button (tap to start/stop), last transcription preview, recording status indicator.

**Expanded view:** Full recording controls, list of all recordings with transcriptions, playback, edit transcription text, and export options.

**Technical flow:**
1. User presses record → frontend calls `invoke('start_recording')`.
2. Rust backend uses `cpal` to capture audio from the default input device, streams to a temporary WAV file.
3. User presses stop → frontend calls `invoke('stop_recording')`.
4. Backend runs `whisper-rs` on the WAV file for offline transcription (or calls an external API if configured).
5. Transcription result is returned to the frontend and saved to the database.
6. Widget emits `voice:transcription_ready` with the transcribed text.

**Events emitted:** `voice:recording_started`, `voice:recording_stopped`, `voice:transcription_ready`.

**Events listened:** None initially.

**Data stored:** Recordings with fields: id, audio_file_path, transcription_text, duration_seconds, created_at.

**Permissions:** `microphone`, `database`, `filesystem`.

**Rust module required:** Yes — audio capture (`cpal`) and transcription (`whisper-rs`).

### 11.4 Generic Web Widget

**Purpose:** Embed any external website within the dashboard.

**Compact view:** Website rendered via an inline `<iframe>` that fills the widget card content area. Includes a loading spinner and error state for sites that block iframe embedding.

**Expanded view:** Full-page iframe view with a toolbar (refresh, open in browser).

**Configuration:** URL (primary setting).

**Events emitted:** None.

**Events listened:** None.

**Permissions:** None (iframes are standard HTML).

---

## 12. Development Phases

### Phase 1 — Foundation

**Objective:** Build the app shell, widget runtime, grid system, and the first widget.

**Deliverables:**
- Tauri 2.x project scaffolding with React + TypeScript + Vite.
- Shell UI: sidebar, top bar, grid area.
- `react-grid-layout` integration with layout persistence (SQLite).
- Widget SDK: manifest loading, WidgetContext injection, widget lifecycle.
- Event bus implementation (Zustand-based).
- SQLite database setup with core tables.
- Dashboard management (create, rename, delete, switch).
- **Daily Tasks Widget** (compact + expanded views).

### Phase 2 — Health & Wellbeing

**Objective:** Add the Craving Control widget and refine inter-widget communication.

**Deliverables:**
- **Craving Control Widget** (compact + expanded views, breathing animation, statistics).
- Event bus integration between Craving and Daily Tasks widgets.
- System tray integration (minimize to tray, toggle visibility).
- Notification system integration.

### Phase 3 — Voice & Web

**Objective:** Add system-level capabilities (audio) and web embedding.

**Deliverables:**
- **Voice Recorder & Transcription Widget** (Rust audio module, Whisper integration).
- Event integration: voice transcription → task creation suggestion.
- **Generic Web Widget** (inline iframe, URL configuration, error handling for blocked sites).

### Phase 4 — Polish & Expand

**Objective:** Refine UX, improve performance, add additional widgets.

**Deliverables:**
- Command palette (`/` key) for quick actions.
- Widget catalog UI with categories and search.
- Keyboard shortcut customization panel.
- Performance optimization (lazy loading, WebView throttling).
- Additional widgets based on needs (Pomodoro, Notes, Clipboard History, System Monitor).
- In-app backup/export for dashboards and data.

---

## 13. Non-Functional Requirements

### 13.1 Performance

- App startup: under 2 seconds to fully interactive state.
- Widget loading: under 200ms per widget.
- Grid drag/resize: 60fps with no visible lag.
- Memory usage: under 150MB base. Web widgets (iframes) add minimal overhead since they share the main WebView2 process.
- Binary size: under 15MB (excluding Whisper model).

### 13.2 Reliability

- All data persisted locally; no data loss on crash (SQLite WAL mode).
- Widget errors are isolated: a crashing widget does not affect the shell or other widgets.
- Graceful degradation: if a web widget iframe fails to load (site blocks embedding), show an error state with "open in browser" option.

### 13.3 Security

- Web widget iframes use the `sandbox` attribute (`allow-scripts allow-same-origin allow-forms allow-popups`) to limit capabilities.
- Widget permissions are declared in manifests and enforced by the runtime.
- No remote code execution: all widget code is bundled locally.
- SQLite database is stored in the user's app data directory with standard OS-level file permissions.

### 13.4 Usability

- All primary actions accessible via keyboard shortcuts.
- Consistent widget card chrome across all widgets.
- Responsive grid: adapts to window resizing.
- Dark and light mode support from v1, with system preference detection and manual toggle.

---

## 14. Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| Some websites block iframe embedding | Sites with `X-Frame-Options: DENY` or restrictive CSP won't render in web widgets | Medium | Show clear error state with "open in browser" fallback. Most documentation, dashboards, and tools work fine. |
| Whisper model is large (~75MB for base, ~1.5GB for large) | Increases app download size if bundled | Medium | Download the base model on first use of the Voice Widget (not bundled). Keep initial binary small (~15MB). Allow user to download larger models optionally. |
| Grid performance degrades with many widgets | Laggy UX with 10+ widgets | Low | Implement virtualization for off-screen widgets; limit grid to a reasonable max (e.g., 20 widgets per dashboard) |
| Rust learning curve | Slower initial development velocity | Medium | Keep Rust code minimal in Phase 1-2 (only DB and system APIs); increase Rust usage gradually |

---

## 15. Future Considerations

Items deliberately excluded from v1 but worth tracking for future versions:

- **Cloud sync:** Sync dashboards and widget data across devices via a cloud backend.
- **Widget marketplace:** Allow other users to publish and install widgets.
- **AI integration:** Use LLMs to power smart suggestions (e.g., auto-categorize tasks from voice notes, predict craving times, summarize daily activity).
- **Automation rules:** A visual rule builder ("when event X occurs, do Y in widget Z") for user-defined automation without code.
- **macOS and Linux support:** Tauri already supports these platforms; the main effort would be testing and platform-specific adjustments.
- **Theming engine:** Allow users to customize colors, fonts, and widget appearance beyond dark/light mode.

---

## 16. Success Metrics

Since this is a personal tool, success is measured qualitatively:

- The app becomes the first thing opened every morning and the last thing closed.
- Cravings are tracked consistently; the breathing exercise is used instead of giving in.
- Voice notes replace manual typing for quick task capture.
- The number of daily context-switches to other apps decreases noticeably.
- Adding a new widget feels fast and frictionless (under 2 hours for a simple widget from scratch).
