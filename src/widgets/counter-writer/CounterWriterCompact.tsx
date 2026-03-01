import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { WidgetViewProps } from '@/lib/widget-sdk/types';

export function CounterWriterCompact({ ctx }: WidgetViewProps) {
  const [count, setCount] = useState(0);

  function handleIncrement(): void {
    const next = count + 1;
    setCount(next);
    ctx.sharedState.write('test:counter', next);
  }

  return (
    <div className="flex h-full flex-col gap-2 text-xs">
      <p>
        <span className="text-muted-foreground">Local count:</span> {count}
      </p>
      <Button variant="outline" size="sm" className="mt-auto w-full" onClick={handleIncrement}>
        Increment
      </Button>
    </div>
  );
}
