import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TopBarProps {
  dashboardName: string;
}

export function TopBar({ dashboardName }: TopBarProps) {
  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-background px-4">
      <h1 className="text-sm font-semibold">{dashboardName}</h1>
      <Button variant="outline" size="sm">
        <Plus className="mr-1.5 h-4 w-4" />
        Add Widget
      </Button>
    </header>
  );
}
