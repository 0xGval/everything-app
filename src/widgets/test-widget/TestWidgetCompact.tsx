import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { WidgetViewProps } from '@/lib/widget-sdk/types';

export function TestWidgetCompact({ ctx }: WidgetViewProps) {
  const [storedValue, setStoredValue] = useState<string>('—');

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
      <Button variant="outline" size="sm" className="mt-auto w-full" onClick={handleSave}>
        Save to DB
      </Button>
    </div>
  );
}
