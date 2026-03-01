# Everything App

## Overview

Everything App is a modular desktop application for Windows built on Tauri 2.0 (Rust backend + React/TypeScript frontend). It serves as a personal productivity and wellbeing dashboard where custom widgets coexist on a drag-and-drop grid, communicate through a shared event bus and state system, and access native OS capabilities (database, audio, filesystem, notifications) via the Rust backend. The core philosophy is progressive modularity: a solid shell with a few essential widgets first, expanding incrementally.

---

## Tech Stack — Exact Versions

| Layer | Technology | Version |
|---|---|---|
| Desktop Framework | Tauri | 2.10.x |
| Frontend | React | 18.3.1 |
| Language | TypeScript | 5.x (strict mode) |
| Bundler | Vite | 7.x |
| Package Manager | pnpm | 9.13.x |
| Node.js | Node | 20.18.0 LTS |
| Rust | rustc | 1.93.x stable |
| CSS | TailwindCSS | 4.x (CSS-first, no tailwind.config.ts) |
| UI Components | shadcn/ui | latest (New York style, OKLCH colors) |
| Grid Layout | react-grid-layout | 2.x (built-in TypeScript types) |
| State Management | zustand | 5.x |
| Animations | motion (was framer-motion) | 12.x |
| Icons | lucide-react | 0.x |
| Database | SQLite via tauri-plugin-sql | 2.x |

### Tauri Plugins (Cargo.toml)

| Plugin | Crate | Feature |
|---|---|---|
| SQL/SQLite | `tauri-plugin-sql` | `features = ["sqlite"]` |
| Notifications | `tauri-plugin-notification` | — |
| File System | `tauri-plugin-fs` | — |
| Global Shortcuts | `tauri-plugin-global-shortcut` | — |
| Autostart | `tauri-plugin-autostart` | — |

Each plugin also requires an npm companion: `@tauri-apps/plugin-sql`, `@tauri-apps/plugin-notification`, `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-global-shortcut`, `@tauri-apps/plugin-autostart`.

### Frontend Dependencies

| Package | Purpose |
|---|---|
| `react-grid-layout` | Drag-and-drop grid (do NOT install `@types/react-grid-layout` — types are built-in) |
| `zustand` | Global state + event bus + shared state |
| `motion` | Animations (import from `"motion/react"`, NOT `"framer-motion"`) |
| `lucide-react` | Icons (default for shadcn/ui) |
| `clsx` | Conditional class names |
| `tailwind-merge` | Conflict-free Tailwind class merging |
| `class-variance-authority` | Component variant management |
| `tw-animate-css` | Animation utilities (replaces deprecated `tailwindcss-animate`) |

---

## Architecture

### 3-Layer Model

```
Layer 1 — Shell (host application)
  Owns: top bar, sidebar, widget grid, settings, widget catalog, dashboard management.
  Responsibilities: loading widgets, layout state, global services, navigation.

Layer 2 — Widget Runtime
  Each widget = isolated React component in the grid.
  Runtime injects WidgetContext with: event bus, db, shared state, settings, notify, invoke.
  Widgets never reference each other directly.

Layer 3 — Rust Backend
  Handles: database, audio capture, file I/O, notifications, global hotkeys.
  Accessed via Tauri invoke() command system.
  Each widget can optionally have a Rust module.
```

### Widget SDK Contract

Every widget has:
- `manifest.json` — metadata, grid constraints, permissions, events, shared state declarations.
- `CompactView` — React component displayed in the grid card.
- `ExpandedView` (optional) — full-page view replacing the grid.
- Optional Rust module for system-level operations.

### WidgetContext API

```typescript
interface WidgetContext {
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
  notify: (title: string, body: string, options?: NotificationOptions) => void;
  invoke: (command: string, args?: object) => Promise<unknown>;
}
```

### Event Bus

- Zustand-based singleton. Any widget can emit/subscribe.
- Event naming: `<domain>:<action>` (e.g., `craving:resisted`, `task:completed`, `voice:transcription_ready`).
- Events are optionally logged to the `events_log` SQLite table.

### Shared State

- Zustand store with namespaced sections (`Record<string, unknown>`).
- Each namespace is owned by one widget (write) but readable by any widget that declares the dependency.
- In-memory only (not persisted across restarts).

### Inter-Widget Communication

1. **Event Bus** — real-time, fire-and-forget, fully decoupled.
2. **Shared State** — persistent in-memory, read/write with subscriptions.
3. **Rust Backend Services** — system-level request/response via `invoke()`.

---

## Folder Structure

```
everything-app/
├── CLAUDE.md                          # This file
├── docs/                              # PRD and implementation plan
│   ├── everything-app-prd.md
│   └── everything-app-implementation-plan.md
├── src/                               # Frontend (React + TypeScript)
│   ├── components/
│   │   ├── ui/                        # shadcn/ui components (auto-generated)
│   │   ├── shell/                     # Shell components
│   │   │   ├── ShellLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   ├── GridArea.tsx
│   │   │   ├── WidgetGrid.tsx
│   │   │   ├── WidgetCard.tsx
│   │   │   ├── WidgetCatalog.tsx
│   │   │   ├── WidgetSettingsDialog.tsx
│   │   │   ├── DashboardDialog.tsx
│   │   │   └── CommandPalette.tsx
│   │   └── shared/                    # Shared components used across widgets
│   ├── hooks/                         # Custom React hooks
│   ├── lib/
│   │   ├── widget-sdk/                # Widget SDK
│   │   │   ├── types.ts              # WidgetManifest, WidgetContext, WidgetDefinition
│   │   │   ├── registry.ts           # Widget registry (Map<id, WidgetDefinition>)
│   │   │   ├── context.ts            # createWidgetContext() factory
│   │   │   ├── event-bus.ts          # EventBus singleton
│   │   │   └── notifications.ts      # Notification service wrapper
│   │   ├── store/                     # Zustand stores
│   │   │   ├── layout-store.ts       # Grid layout state
│   │   │   ├── dashboard-store.ts    # Dashboard management
│   │   │   └── shared-state.ts       # Cross-widget shared state
│   │   └── utils.ts                  # cn() helper, other utilities
│   ├── widgets/                       # Individual widget folders
│   │   ├── daily-tasks/
│   │   │   ├── manifest.json
│   │   │   ├── DailyTasksCompact.tsx
│   │   │   ├── DailyTasksExpanded.tsx
│   │   │   └── config.ts
│   │   ├── craving-control/
│   │   │   ├── manifest.json
│   │   │   ├── CravingCompact.tsx
│   │   │   ├── CravingExpanded.tsx
│   │   │   ├── BreathingExercise.tsx
│   │   │   └── config.ts
│   │   ├── voice-recorder/
│   │   │   ├── manifest.json
│   │   │   ├── VoiceRecorderCompact.tsx
│   │   │   ├── VoiceRecorderExpanded.tsx
│   │   │   └── config.ts
│   │   └── web-widget/
│   │       ├── manifest.json
│   │       ├── WebWidgetCompact.tsx
│   │       ├── WebWidgetExpanded.tsx
│   │       └── config.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css                      # TailwindCSS v4 entry + shadcn theme variables
├── src-tauri/                         # Backend (Rust)
│   ├── src/
│   │   ├── lib.rs                     # Tauri entry point, plugin registration
│   │   ├── commands/                  # Tauri invoke commands
│   │   │   ├── mod.rs
│   │   │   ├── dashboard.rs
│   │   │   ├── widget.rs
│   │   │   ├── audio.rs               # Phase 3
│   │   │   ├── transcription.rs       # Phase 3
│   │   │   └── webview.rs             # Phase 3
│   │   └── db/                        # Database initialization and migrations
│   │       ├── mod.rs
│   │       └── migrations.rs
│   ├── capabilities/                  # Tauri 2.x permissions (replaces v1 allowlist)
│   │   └── default.json
│   ├── icons/
│   ├── Cargo.toml
│   └── tauri.conf.json
├── components.json                    # shadcn/ui configuration
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── .eslintrc.cjs                      # ESLint config (flat config)
├── .prettierrc                        # Prettier config
└── .gitignore
```

---

## Coding Conventions

### TypeScript

- **Strict mode** enabled (`"strict": true` in tsconfig).
- Use `unknown` over `any` wherever possible.
- Explicit return types on exported functions.
- Prefer `interface` over `type` for object shapes.
- No enums — use `as const` objects or union types.

### Naming Conventions

| Item | Convention | Example |
|---|---|---|
| React components | PascalCase `.tsx` | `WidgetCard.tsx`, `CravingCompact.tsx` |
| Folders | kebab-case | `craving-control/`, `widget-sdk/` |
| Hooks | camelCase with `use` prefix, kebab-case file | `useLayoutStore` in `layout-store.ts` |
| Zustand stores | camelCase with `use` prefix | `useLayoutStore`, `useDashboardStore` |
| Utility files | kebab-case `.ts` | `event-bus.ts`, `shared-state.ts` |
| Rust modules | snake_case | `audio.rs`, `transcription.rs` |
| Rust commands | snake_case | `get_dashboards`, `save_widget_data` |
| Events | `<domain>:<action>` | `craving:resisted`, `task:completed` |
| Shared state keys | `<domain>:<data>` | `craving:stats`, `tasks:today` |
| CSS variables | `--kebab-case` | `--background`, `--card-foreground` |

### Formatting (Prettier)

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "jsxSingleQuote": false,
  "arrowParens": "always"
}
```

### Import Ordering

1. React and React-related (`react`, `react-dom`)
2. External libraries (`zustand`, `motion/react`, `lucide-react`)
3. Tauri APIs (`@tauri-apps/api/core`, `@tauri-apps/plugin-*`)
4. Internal aliases (`@/components/`, `@/lib/`, `@/widgets/`)
5. Relative imports (`./`, `../`)
6. CSS/styles

Blank line between each group.

---

## Key Patterns

### How to Create a New Widget

1. Create a folder: `src/widgets/<widget-name>/`
2. Create `manifest.json` with: id, name, description, icon (Lucide name), type ("native"), grid constraints, permissions, events (emits/listens), sharedState (reads/writes), hasExpandedView, settings schema.
3. Create `<WidgetName>Compact.tsx` — receives `{ ctx: WidgetContext }` as props.
4. Optionally create `<WidgetName>Expanded.tsx` — same props interface.
5. Create `config.ts` — default settings.
6. Register the widget in the `WidgetRegistry`:
   ```typescript
   import { registerWidget } from '@/lib/widget-sdk/registry';
   import manifest from './manifest.json';
   import { WidgetNameCompact } from './WidgetNameCompact';
   import { WidgetNameExpanded } from './WidgetNameExpanded';

   registerWidget({
     manifest,
     CompactView: WidgetNameCompact,
     ExpandedView: WidgetNameExpanded,
   });
   ```

### How to Add a New Tauri Command

1. Create or edit a file in `src-tauri/src/commands/`.
2. Define the command:
   ```rust
   #[tauri::command]
   async fn my_command(arg: String) -> Result<String, String> {
       Ok(format!("Hello {}", arg))
   }
   ```
3. Register in `lib.rs`:
   ```rust
   .invoke_handler(tauri::generate_handler![commands::my_command])
   ```
4. Add permissions in `src-tauri/capabilities/default.json` if needed.
5. Call from frontend:
   ```typescript
   import { invoke } from '@tauri-apps/api/core';
   const result = await invoke('my_command', { arg: 'world' });
   ```
   Note: Rust `snake_case` args map to JS `camelCase` automatically.

### How to Add a New shadcn Component

```bash
pnpm dlx shadcn@latest add <component-name>
```

Components are copied into `src/components/ui/`. They are fully owned — edit freely.

---

## Tauri 2.x Plugin Registration (lib.rs)

Each plugin has a different initialization pattern:

```rust
use tauri_plugin_autostart::MacosLauncher;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())         // Builder pattern
        .plugin(tauri_plugin_notification::init())                     // init()
        .plugin(tauri_plugin_fs::init())                               // init()
        .plugin(tauri_plugin_global_shortcut::Builder::default().build()) // Builder pattern
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None)) // init(args)
        .invoke_handler(tauri::generate_handler![/* commands */])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## Tauri 2.x Capabilities (Permissions)

Tauri 2.x replaced the v1 `allowlist` with a capabilities system. Create JSON files in `src-tauri/capabilities/`:

```json
{
  "identifier": "default",
  "description": "Default app capabilities",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "sql:default",
    "notification:default",
    "fs:default",
    "global-shortcut:allow-register",
    "autostart:default"
  ]
}
```

---

## Current Phase

**Phase 1.1 — Project Scaffolding** (not yet started)

See `docs/everything-app-implementation-plan.md` for the full 30 micro-phase plan.

---

## Commands

```bash
# Development
pnpm tauri dev                          # Start Tauri dev mode with hot reload
pnpm dev                                # Start Vite dev server only (frontend)
pnpm build                              # Build frontend for production
pnpm tauri build                        # Build full Tauri production binary

# shadcn/ui
pnpm dlx shadcn@latest add <component>  # Add a shadcn component
pnpm dlx shadcn@latest add -a           # Add all shadcn components

# Linting & Formatting
pnpm lint                               # Run ESLint
pnpm format                             # Run Prettier

# Rust
cargo check                             # Check Rust code (from src-tauri/)
cargo clippy                            # Lint Rust code (from src-tauri/)
cargo test                              # Run Rust tests (from src-tauri/)
```

---

## Known Decisions

| Decision | Rationale |
|---|---|
| React 18.3.1 (not 19) | react-grid-layout has known compatibility issues with React 19 |
| Separate WebviewWindows for web widgets | Tauri multiwebview is behind `unstable` flag with known bugs; separate windows are stable |
| TailwindCSS v4 (CSS-first, no config file) | Latest version; shadcn/ui fully supports it |
| shadcn/ui New York style | Default style is deprecated; New York is the current standard |
| OKLCH colors (not HSL) | shadcn/ui + TailwindCSS v4 default |
| `motion` package (not `framer-motion`) | framer-motion was renamed; import from `"motion/react"` |
| `tw-animate-css` (not `tailwindcss-animate`) | tailwindcss-animate is deprecated |
| Zustand 5 for all state | Event bus, shared state, layout store, dashboard store |
| SQLite for all persistence | Single local DB file, WAL mode for crash safety |
| Whisper model downloaded on first use | Keeps binary small (~15MB); download ~75MB base model when Voice Widget first used |
| Native Windows title bar | Simpler, familiar; can switch to custom frameless later |
| Dark + Light theme from start | shadcn/ui generates both; minimal extra work |
| pnpm 9.x (not 10.x) | Avoids lifecycle scripts breaking change in pnpm 10 |
| App identifier: `dev.everythingapp.app` | Tauri 2.x requires a reverse-domain identifier |
| Offline-first architecture | No cloud sync in v1; all data local |

---

## Things to Watch Out For

### Tauri 2.x

- **Import path changed from v1**: Use `@tauri-apps/api/core` (not `@tauri-apps/api/tauri`).
- **No `allowlist`**: Use capabilities/permissions JSON files in `src-tauri/capabilities/`.
- **Window creation deadlocks on Windows**: Always use `async` commands when creating `WebviewWindow` from Tauri commands. Synchronous commands will deadlock.
- **Plugin init patterns are NOT uniform**: sql uses Builder, notification uses init(), autostart uses init(args). Check each one.
- **Type renames from v1**: `Window` -> `WebviewWindow`, `WindowBuilder` -> `WebviewWindowBuilder`, `WindowUrl` -> `WebviewUrl`, `Manager::get_window()` -> `Manager::get_webview_window()`.
- **Frontend origin changed**: Now `http://tauri.localhost` (was `https://`). Set `useHttpsScheme: true` in config if you need to preserve IndexedDB/localStorage between upgrades.

### WebView2 (Windows)

- WebView2 renders above all React content (z-ordering). Must hide WebView windows when dialogs/sheets/menus are open.
- Each WebView2 instance consumes ~50-80MB RAM. Limit to 4-5 concurrent.
- Session persistence requires setting `data_directory()` on the WebviewWindow.

### react-grid-layout

- Do NOT pass inline `layouts={{...}}` — memoize the layouts object to avoid infinite re-renders.
- Must import CSS: `react-grid-layout/css/styles.css` and `react-resizable/css/styles.css`.
- Type names changed in v2: `RGL.Layout` -> `LayoutItem`, `RGL.Layouts` -> `ResponsiveLayouts`.

### Zustand v5

- Object selectors require `useShallow` from `zustand/react/shallow` to avoid max update depth errors.
- `useStore(selector, shallow)` no longer works. Use `useStore(useShallow(selector))` instead.

### TailwindCSS v4

- No `tailwind.config.ts` file. Configuration is CSS-first via `@theme { }` in CSS.
- No `postcss.config.js` or `autoprefixer` needed with Vite — use `@tailwindcss/vite` plugin.
- Entry point is `@import "tailwindcss";` (not the v3 `@tailwind base/components/utilities` directives).

### shadcn/ui

- Style `"default"` is deprecated. Use `"new-york"`.
- Colors are OKLCH format (not HSL).
- `components.json` field `tailwind.config` must be empty string for TailwindCSS v4.
- `rsc` must be `false` for Vite projects (no React Server Components).

### Performance

- Widget lazy loading for off-screen widgets (IntersectionObserver).
- WebView throttling for off-screen web widgets.
- Event bus debouncing for high-frequency events.
- Database query batching on dashboard load.
- `React.memo` on WidgetCard, `useMemo` for expensive computations.
- Target: app startup < 2s, widget load < 200ms, grid drag at 60fps, base memory < 150MB.
