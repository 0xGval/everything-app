import React from 'react';
import { GripVertical, Maximize2, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface WidgetCardProps {
  title: string;
  children: React.ReactNode;
}

export const WidgetCard = React.memo(function WidgetCard({ title, children }: WidgetCardProps) {
  return (
    <Card className="flex h-full flex-col gap-0 overflow-hidden rounded-lg py-0">
      <div className="flex h-9 shrink-0 items-center gap-0 border-b border-border px-2">
        <div className="drag-handle cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground">
          <GripVertical className="h-3.5 w-3.5" />
        </div>
        <span className="flex-1 truncate px-1 text-xs font-medium">{title}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Maximize2 className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Settings className="h-3 w-3" />
        </Button>
      </div>
      <CardContent className="flex-1 overflow-auto p-3">{children}</CardContent>
    </Card>
  );
});
