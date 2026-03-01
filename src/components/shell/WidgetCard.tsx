import React, { useEffect, useMemo, useState } from 'react';
import { GripVertical, Maximize2, Settings, icons, type LucideIcon } from 'lucide-react';

const iconsRecord = icons as Record<string, LucideIcon>;
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getWidget } from '@/lib/widget-sdk/registry';
import { createWidgetContext } from '@/lib/widget-sdk/context';
import { loadSettings, onSettingsChange } from '@/lib/widget-sdk/settings-cache';
import { WidgetSettingsDialog } from './WidgetSettingsDialog';

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);
  const [, setSettingsVersion] = useState(0);

  // Preload settings from DB
  useEffect(() => {
    loadSettings(widgetInstanceId).then(() => setSettingsReady(true));
  }, [widgetInstanceId]);

  // Re-render widget when settings change
  useEffect(() => {
    return onSettingsChange(widgetInstanceId, () => {
      setSettingsVersion((v) => v + 1);
    });
  }, [widgetInstanceId]);

  const title = definition?.manifest.name ?? widgetType;
  const IconComponent = definition?.manifest.icon
    ? iconsRecord[definition.manifest.icon] ?? null
    : null;

  return (
    <>
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
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-3 w-3" />
          </Button>
        </div>
        <CardContent className="flex-1 overflow-auto p-3">
          {definition && settingsReady ? (
            <definition.CompactView ctx={ctx} />
          ) : definition ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Loading...
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Widget &quot;{widgetType}&quot; not found in registry
            </div>
          )}
        </CardContent>
      </Card>
      {definition && (
        <WidgetSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          widgetInstanceId={widgetInstanceId}
          widgetName={definition.manifest.name}
          schema={definition.manifest.settings}
        />
      )}
    </>
  );
});
