import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Moon,
  Plus,
  Sun,
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
import { getAllWidgets } from '@/lib/widget-sdk/registry';

const iconsRecord = icons as Record<string, LucideIcon>;

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  const dashboards = useDashboardStore((s) => s.dashboards);
  const setActiveDashboard = useDashboardStore((s) => s.setActive);
  const addWidget = useLayoutStore((s) => s.addWidget);
  const widgets = useLayoutStore((s) => s.widgets);
  const expandWidget = useLayoutStore((s) => s.expandWidget);

  const allWidgetDefs = useMemo(() => getAllWidgets(), []);

  // Open on Ctrl+K or / (when no input focused)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      if (e.key === '/' && !isInputFocused()) {
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

      // Switch dashboard
      if (action.startsWith('dashboard:')) {
        const id = action.slice('dashboard:'.length);
        setActiveDashboard(id);
        return;
      }

      // Add widget
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

      // Expand widget
      if (action.startsWith('expand:')) {
        const [instanceId, widgetType] = action.slice('expand:'.length).split('|');
        expandWidget(instanceId, widgetType);
        return;
      }

      // Toggle theme
      if (action === 'theme:toggle') {
        document.documentElement.classList.toggle('dark');
        return;
      }
    },
    [setActiveDashboard, addWidget, expandWidget, allWidgetDefs],
  );

  // Expandable widgets currently on grid
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

        {/* Dashboards */}
        <CommandGroup heading="Dashboards">
          {dashboards.map((d, i) => {
            const Icon = iconsRecord[d.icon] ?? LayoutDashboard;
            return (
              <CommandItem
                key={d.id}
                value={`Switch to ${d.name}`}
                onSelect={() => handleSelect(`dashboard:${d.id}`)}
              >
                <Icon className="h-4 w-4" />
                <span>Switch to {d.name}</span>
                {i < 9 && <CommandShortcut>Ctrl+{i + 1}</CommandShortcut>}
              </CommandItem>
            );
          })}
        </CommandGroup>

        {/* Add Widgets */}
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

        {/* Expand Widgets */}
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

        {/* Theme */}
        <CommandGroup heading="Appearance">
          <CommandItem value="Toggle theme" onSelect={() => handleSelect('theme:toggle')}>
            <Sun className="h-4 w-4 dark:hidden" />
            <Moon className="hidden h-4 w-4 dark:block" />
            <span>Toggle theme</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || (el as HTMLElement).isContentEditable;
}
