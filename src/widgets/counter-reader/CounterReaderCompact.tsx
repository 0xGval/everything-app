import { useEffect, useState } from 'react';
import type { WidgetViewProps } from '@/lib/widget-sdk/types';

export function CounterReaderCompact({ ctx }: WidgetViewProps) {
  const [value, setValue] = useState<unknown>(ctx.sharedState.read('test:counter'));

  useEffect(() => {
    const unsub = ctx.sharedState.subscribe('test:counter', (next) => {
      setValue(next);
    });
    return unsub;
  }, [ctx]);

  return (
    <div className="flex h-full flex-col gap-2 text-xs">
      <p>
        <span className="text-muted-foreground">Shared counter:</span>{' '}
        <span className="text-lg font-bold">{value !== undefined ? String(value) : '—'}</span>
      </p>
      <p className="text-muted-foreground">Updates in real time from Counter Writer</p>
    </div>
  );
}
