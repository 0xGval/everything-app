import { LayoutGrid } from 'lucide-react';

export function GridArea() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <LayoutGrid className="h-10 w-10 opacity-40" />
        <p className="text-sm">No widgets yet</p>
        <p className="text-xs opacity-60">Click "Add Widget" to get started</p>
      </div>
    </div>
  );
}
