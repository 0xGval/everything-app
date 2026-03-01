import { useState } from 'react';
import { Plus, icons, type LucideIcon } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { getAllWidgets } from '@/lib/widget-sdk/registry';
import { useLayoutStore } from '@/lib/store/layout-store';

const iconsRecord = icons as Record<string, LucideIcon>;

interface WidgetCatalogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WidgetCatalog({ open, onOpenChange }: WidgetCatalogProps) {
  const [search, setSearch] = useState('');
  const addWidget = useLayoutStore((s) => s.addWidget);

  const allWidgets = getAllWidgets();
  const filtered = search
    ? allWidgets.filter(
        (w) =>
          w.manifest.name.toLowerCase().includes(search.toLowerCase()) ||
          w.manifest.description.toLowerCase().includes(search.toLowerCase()),
      )
    : allWidgets;

  function handleAdd(manifest: { id: string; grid: { defaultW: number; defaultH: number; minW: number; minH: number } }): void {
    addWidget(manifest.id, {
      w: manifest.grid.defaultW,
      h: manifest.grid.defaultH,
      minW: manifest.grid.minW,
      minH: manifest.grid.minH,
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-80 flex-col gap-0 p-0 sm:w-96">
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle>Add Widget</SheetTitle>
        </SheetHeader>
        <div className="px-4 py-3">
          <Input
            placeholder="Search widgets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-auto px-4 pb-4">
          <div className="flex flex-col gap-2">
            {filtered.map((def) => {
              const Icon = iconsRecord[def.manifest.icon] ?? null;
              return (
                <Card key={def.manifest.id} className="flex items-start gap-3 p-3">
                  {Icon && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{def.manifest.name}</p>
                    <p className="text-xs text-muted-foreground">{def.manifest.description}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => handleAdd(def.manifest)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </Card>
              );
            })}
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No widgets found
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
