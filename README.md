# Everything App

A modular desktop productivity dashboard for Windows, built with **Tauri 2.0** (Rust + React/TypeScript). Drag-and-drop widgets on a customizable grid — tasks, health tracking, voice recording, web embeds, and more — all in one native app.

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop Framework | Tauri 2.10.x |
| Frontend | React 18 + TypeScript (strict) |
| Bundler | Vite 7.x |
| Styling | TailwindCSS 4.x + shadcn/ui (New York, OKLCH) |
| State | Zustand 5.x |
| Grid | react-grid-layout 2.x |
| Database | SQLite (via tauri-plugin-sql) |
| Animations | Motion 12.x |
| Transcription | Groq API (Whisper v3 large) |

## Architecture

```
Shell (sidebar, top bar, grid, command palette, settings)
  └── Widget Runtime (event bus, shared state, context injection)
       └── Rust Backend (SQLite, audio capture, filesystem, notifications)
```

- **Widgets** are isolated React components with a manifest, compact view, and optional expanded view.
- **Event Bus** (Zustand) enables decoupled inter-widget communication (`domain:action` pattern).
- **Shared State** (Zustand) provides namespaced read/write with subscriptions.
- **Rust Backend** handles system-level ops via Tauri `invoke()` commands.
- **Error Boundaries** isolate widget crashes — one widget failing won't take down the app.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20.x LTS
- [pnpm](https://pnpm.io/) 9.x
- [Rust](https://www.rust-lang.org/tools/install) 1.93+ stable
- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) (WebView2 on Windows)

### Setup

```bash
git clone https://github.com/0xGval/everything-app.git
cd everything-app
pnpm install
```

### Development

```bash
pnpm tauri dev        # Full app with hot reload
pnpm dev              # Frontend only (Vite dev server)
```

### Build

```bash
pnpm tauri build      # Production binary
```

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   └── shell/           # Shell (Sidebar, TopBar, WidgetGrid, WidgetCard,
│                        #   CommandPalette, AppSettingsDialog, LazyWidget,
│                        #   WidgetErrorBoundary, WidgetCatalog, etc.)
├── lib/
│   ├── widget-sdk/      # Widget SDK (types, registry, event bus, context,
│   │                    #   settings cache, notifications)
│   └── store/           # Zustand stores (layout, dashboard, shared state,
│                        #   shortcuts, theme)
├── widgets/             # Widget modules
│   ├── daily-tasks/     # Task management with categories & recurring
│   ├── craving-control/ # Breathing exercises & craving tracking
│   ├── voice-recorder/  # Voice recording & Groq transcription
│   └── web-widget/      # Embedded websites via inline iframes
└── App.tsx

src-tauri/
├── src/
│   ├── lib.rs           # Tauri entry point, plugin registration, system tray
│   ├── commands/        # Invoke commands (dashboard, widget, audio, transcription)
│   └── db/              # Database initialization & migrations
├── capabilities/        # Tauri 2.x permissions
└── Cargo.toml
```

## Widgets

| Widget | Status | Description |
|---|---|---|
| Daily Tasks | Done | Task management with categories, recurring tasks, weekly overview, future scheduling |
| Craving Control | Done | Breathing exercises, craving history, statistics, streak counter, native notifications |
| Voice Recorder | Done | Audio recording (cpal), Groq API transcription, playback, edit, delete, search |
| Web Widget | Done | Embed any website via inline iframes, toolbar (refresh, open in browser), error detection |

## Features

- **Drag-and-drop grid** — arrange and resize widgets freely
- **Multiple dashboards** — create, rename, delete, switch (Ctrl+1-9)
- **Command palette** — `/` or `Ctrl+K` for quick actions
- **Dark/Light/System theme** — toggle in sidebar, persisted to SQLite
- **Customizable keyboard shortcuts** — rebind any shortcut in settings
- **System tray** — minimize to tray, click to restore
- **Inter-widget events** — e.g. craving resisted auto-completes a daily task
- **Error boundaries** — widget crashes are isolated with reload/remove options
- **Lazy loading** — off-screen widgets load on demand via IntersectionObserver
- **Offline-first** — all data stored locally in SQLite

## Adding a New Widget

1. Create `src/widgets/<widget-name>/` with:
   - `manifest.json` — metadata, grid constraints, permissions, events, settings
   - `<WidgetName>Compact.tsx` — receives `{ ctx: WidgetContext }` props
   - `<WidgetName>Expanded.tsx` (optional) — full-page view
   - `config.ts` — register with `registerWidget()`
2. Import `config.ts` in `src/main.tsx`
3. The widget appears in the catalog automatically


## Documentation

- [Product Requirements](docs/everything-app-prd.md)
- [Implementation Plan](docs/everything-app-implementation-plan.md) (30 micro-phases)

## License

Private project.
