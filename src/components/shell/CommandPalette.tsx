import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Moon,
  Plus,
  Sun,
  SunMoon,
  icons,
  type LucideIcon,
} from 'lucide-react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';
import { useDashboardStore } from '@/lib/store/dashboard-store';
import { useLayoutStore } from '@/lib/store/layout-store';
import { useShortcutsStore, matchesBinding } from '@/lib/store/shortcuts-store';
import { useThemeStore } from '@/lib/store/theme-store';
import { getAllWidgets } from '@/lib/widget-sdk/registry';

const iconsRecord = icons as Record<string, LucideIcon>;

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || (el as HTMLElement).isContentEditable;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  const dashboards = useDashboardStore((s) => s.dashboards);
  const setActiveDashboard = useDashboardStore((s) => s.setActive);
  const addWidget = useLayoutStore((s) => s.addWidget);
  const widgets = useLayoutStore((s) => s.widgets);
  const expandWidget = useLayoutStore((s) => s.expandWidget);
  const getBinding = useShortcutsStore((s) => s.getBinding);
  const setTheme = useThemeStore((s) => s.setTheme);

  const allWidgetDefs = useMemo(() => getAllWidgets(), []);

  // Open on customizable shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const { shortcuts } = useShortcutsStore.getState();
      const ctrlKBinding = shortcuts.find((s) => s.id === 'command-palette')?.binding ?? 'Ctrl+K';
      const slashBinding = shortcuts.find((s) => s.id === 'command-palette-slash')?.binding ?? '/';

      if (matchesBinding(e, ctrlKBinding)) {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      if (matchesBinding(e, slashBinding) && !isInputFocused()) {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelect = useCallback(
    (action: string) => {
      setOpen(false);

      if (action.startsWith('dashboard:')) {
        const id = action.slice('dashboard:'.length);
        setActiveDashboard(id);
        return;
      }

      if (action.startsWith('add:')) {
        const widgetId = action.slice('add:'.length);
        const def = allWidgetDefs.find((w) => w.manifest.id === widgetId);
        if (def) {
          addWidget(widgetId, {
            w: def.manifest.grid.defaultW,
            h: def.manifest.grid.defaultH,
            minW: def.manifest.grid.minW,
            minH: def.manifest.grid.minH,
          });
        }
        return;
      }

      if (action.startsWith('expand:')) {
        const [instanceId, widgetType] = action.slice('expand:'.length).split('|');
        expandWidget(instanceId, widgetType);
        return;
      }

      if (action === 'theme:dark') { setTheme('dark'); return; }
      if (action === 'theme:light') { setTheme('light'); return; }
      if (action === 'theme:system') { setTheme('system'); return; }
    },
    [setActiveDashboard, addWidget, expandWidget, allWidgetDefs, setTheme],
  );

  const expandableWidgets = useMemo(() => {
    return widgets
      .map((w) => {
        const def = allWidgetDefs.find((d) => d.manifest.id === w.widgetType);
        if (!def?.manifest.hasExpandedView || !def.ExpandedView) return null;
        return { instanceId: w.id, widgetType: w.widgetType, name: def.manifest.name, icon: def.manifest.icon };
      })
      .filter(Boolean) as { instanceId: string; widgetType: string; name: string; icon: string }[];
  }, [widgets, allWidgetDefs]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen} showCloseButton={false}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Dashboards">
          {dashboards.map((d, i) => {
            const Icon = iconsRecord[d.icon] ?? LayoutDashboard;
            const shortcutBinding = getBinding(`dashboard-${i + 1}`);
            return (
              <CommandItem
                key={d.id}
                value={`Switch to ${d.name}`}
                onSelect={() => handleSelect(`dashboard:${d.id}`)}
              >
                <Icon className="h-4 w-4" />
                <span>Switch to {d.name}</span>
                {i < 9 && shortcutBinding && <CommandShortcut>{shortcutBinding}</CommandShortcut>}
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandGroup heading="Add Widget">
          {allWidgetDefs.map((def) => {
            const Icon = iconsRecord[def.manifest.icon] ?? Plus;
            return (
              <CommandItem
                key={def.manifest.id}
                value={`Add ${def.manifest.name}`}
                onSelect={() => handleSelect(`add:${def.manifest.id}`)}
              >
                <Icon className="h-4 w-4" />
                <span>Add {def.manifest.name}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        {expandableWidgets.length > 0 && (
          <CommandGroup heading="Open Widget">
            {expandableWidgets.map((w) => {
              const Icon = iconsRecord[w.icon] ?? LayoutDashboard;
              return (
                <CommandItem
                  key={w.instanceId}
                  value={`Open ${w.name} ${w.instanceId}`}
                  onSelect={() => handleSelect(`expand:${w.instanceId}|${w.widgetType}`)}
                >
                  <Icon className="h-4 w-4" />
                  <span>Open {w.name}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        <CommandGroup heading="Appearance">
          <CommandItem value="Theme: Light" onSelect={() => handleSelect('theme:light')}>
            <Sun className="h-4 w-4" />
            <span>Light mode</span>
          </CommandItem>
          <CommandItem value="Theme: Dark" onSelect={() => handleSelect('theme:dark')}>
            <Moon className="h-4 w-4" />
            <span>Dark mode</span>
          </CommandItem>
          <CommandItem value="Theme: System" onSelect={() => handleSelect('theme:system')}>
            <SunMoon className="h-4 w-4" />
            <span>System theme</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
