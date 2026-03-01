import React, { useMemo } from 'react';
import { GripVertical, Maximize2, Settings, icons } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getWidget } from '@/lib/widget-sdk/registry';
import { createWidgetContext } from '@/lib/widget-sdk/context';

interface WidgetCardProps {
  widgetInstanceId: string;
  widgetType: string;
}

export const WidgetCard = React.memo(function WidgetCard({
  widgetInstanceId,
  widgetType,
}: WidgetCardProps) {
  const definition = getWidget(widgetType);
  const ctx = useMemo(() => createWidgetContext(widgetInstanceId), [widgetInstanceId]);

  const title = definition?.manifest.name ?? widgetType;
  const IconComponent =
    definition?.manifest.icon && definition.manifest.icon in icons
      ? icons[definition.manifest.icon as keyof typeof icons]
      : null;

  return (
    <Card className="flex h-full flex-col gap-0 overflow-hidden rounded-lg py-0">
      <div className="flex h-9 shrink-0 items-center gap-0 border-b border-border px-2">
        <div className="drag-handle cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground">
          <GripVertical className="h-3.5 w-3.5" />
        </div>
        {IconComponent && (
          <IconComponent className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="flex-1 truncate px-1 text-xs font-medium">{title}</span>
        {definition?.manifest.hasExpandedView && (
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Maximize2 className="h-3 w-3" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Settings className="h-3 w-3" />
        </Button>
      </div>
      <CardContent className="flex-1 overflow-auto p-3">
        {definition ? (
          <definition.CompactView ctx={ctx} />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Widget &quot;{widgetType}&quot; not found in registry
          </div>
        )}
      </CardContent>
    </Card>
  );
});
