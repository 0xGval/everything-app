import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { WidgetViewProps } from '@/lib/widget-sdk/types';

export function TestWidgetCompact({ ctx }: WidgetViewProps) {
  const [storedValue, setStoredValue] = useState<string>('—');

  const refreshInterval = ctx.settings.get('refreshInterval') ?? 30;
  const showTimestamp = ctx.settings.get('showTimestamp') ?? true;
  const displayMode = ctx.settings.get('displayMode') ?? 'compact';

  useEffect(() => {
    ctx.db.get('test').then((val) => {
      if (val !== undefined) setStoredValue(String(val));
    });
  }, [ctx]);

  async function handleSave(): Promise<void> {
    const value = `hello @ ${new Date().toLocaleTimeString()}`;
    await ctx.db.set('test', value);
    setStoredValue(value);
  }

  return (
    <div className="flex h-full flex-col gap-2 text-xs">
      <p>
        <span className="text-muted-foreground">ID:</span> {ctx.widgetId}
      </p>
      <p>
        <span className="text-muted-foreground">Stored:</span> {storedValue}
      </p>
      <div className="rounded-md bg-muted p-1.5">
        <p>
          <span className="text-muted-foreground">Refresh:</span> {String(refreshInterval)}s
        </p>
        {displayMode === 'detailed' && (
          <p>
            <span className="text-muted-foreground">Mode:</span> {String(displayMode)}
          </p>
        )}
        {showTimestamp && (
          <p>
            <span className="text-muted-foreground">Time:</span>{' '}
            {new Date().toLocaleTimeString()}
          </p>
        )}
      </div>
      <Button variant="outline" size="sm" className="mt-auto w-full" onClick={handleSave}>
        Save to DB
      </Button>
    </div>
  );
}
