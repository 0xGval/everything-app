import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WidgetCatalog } from './WidgetCatalog';

interface TopBarProps {
  dashboardName: string;
}

export function TopBar({ dashboardName }: TopBarProps) {
  const [catalogOpen, setCatalogOpen] = useState(false);

  return (
    <>
      <header className="flex h-12 items-center justify-between border-b border-border bg-background px-4">
        <h1 className="text-sm font-semibold">{dashboardName}</h1>
        <Button variant="outline" size="sm" onClick={() => setCatalogOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Widget
        </Button>
      </header>
      <WidgetCatalog open={catalogOpen} onOpenChange={setCatalogOpen} />
    </>
  );
}
