# Everything App

A modular desktop productivity dashboard for Windows, built with **Tauri 2.0** (Rust + React/TypeScript). Drag-and-drop widgets on a customizable grid — tasks, health tracking, voice recording, web embeds, and more — all in one native app.

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop Framework | Tauri 2.10.x |
| Frontend | React 18 + TypeScript (strict) |
| Bundler | Vite 7.x |
| Styling | TailwindCSS 4.x + shadcn/ui (New York) |
| State | Zustand 5.x |
| Grid | react-grid-layout 2.x |
| Database | SQLite (via tauri-plugin-sql) |
| Animations | Motion 12.x |

## Architecture

```
Shell (sidebar, top bar, grid, settings)
  └── Widget Runtime (event bus, shared state, context injection)
       └── Rust Backend (SQLite, audio, filesystem, notifications)
```

- **Widgets** are isolated React components with a manifest, compact view, and optional expanded view.
- **Event Bus** (Zustand) enables decoupled inter-widget communication (`domain:action` pattern).
- **Shared State** (Zustand) provides namespaced read/write with subscriptions.
- **Rust Backend** handles system-level ops via Tauri `invoke()` commands.

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
│   └── shell/           # Shell (Sidebar, TopBar, WidgetGrid, WidgetCard, etc.)
├── lib/
│   ├── widget-sdk/      # Widget SDK (types, registry, event bus, context)
│   └── store/           # Zustand stores (layout, dashboard, shared state)
├── widgets/             # Widget modules
│   ├── daily-tasks/     # Task management with categories & recurring
│   ├── craving-control/ # (planned) Breathing exercises & craving tracking
│   ├── voice-recorder/  # (planned) Voice recording & transcription
│   └── web-widget/      # (planned) Embedded web pages
└── App.tsx

src-tauri/
├── src/
│   ├── lib.rs           # Tauri entry point, plugin registration
│   ├── commands/        # Invoke commands (dashboard, widget, audio)
│   └── db/              # Database migrations
├── capabilities/        # Tauri 2.x permissions
└── Cargo.toml
```

## Widgets

| Widget | Status | Description |
|---|---|---|
| Daily Tasks | Done | Task management with categories, recurring tasks, weekly overview, future scheduling |
| Craving Control | Planned | Breathing exercises, craving tracking, streak counter |
| Voice Recorder | Planned | Audio recording with offline Whisper transcription |
| Web Widget | Planned | Embed any website via separate WebviewWindows |

## Documentation

- [Product Requirements](docs/everything-app-prd.md)
- [Implementation Plan](docs/everything-app-implementation-plan.md) (30 micro-phases)

## License

Private project.
