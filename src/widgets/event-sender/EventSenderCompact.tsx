import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { WidgetViewProps } from '@/lib/widget-sdk/types';

export function EventSenderCompact({ ctx }: WidgetViewProps) {
  const [count, setCount] = useState(0);

  function handleSend(): void {
    const time = Date.now();
    ctx.emit('test:ping', { time, count: count + 1 });
    setCount((c) => c + 1);
  }

  return (
    <div className="flex h-full flex-col gap-2 text-xs">
      <p>
        <span className="text-muted-foreground">Sent:</span> {count} events
      </p>
      <Button variant="outline" size="sm" className="mt-auto w-full" onClick={handleSend}>
        Send Event
      </Button>
    </div>
  );
}
