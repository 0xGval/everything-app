import { useEffect, useState } from 'react';
import type { WidgetViewProps } from '@/lib/widget-sdk/types';

interface PingPayload {
  time: number;
  count: number;
}

export function EventReceiverCompact({ ctx }: WidgetViewProps) {
  const [lastPing, setLastPing] = useState<PingPayload | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const unsub = ctx.on('test:ping', (payload) => {
      setLastPing(payload as PingPayload);
      setTotal((t) => t + 1);
    });
    return unsub;
  }, [ctx]);

  return (
    <div className="flex h-full flex-col gap-2 text-xs">
      <p>
        <span className="text-muted-foreground">Received:</span> {total} events
      </p>
      {lastPing ? (
        <div className="rounded-md bg-muted p-2">
          <p>
            <span className="text-muted-foreground">Count:</span> {lastPing.count}
          </p>
          <p>
            <span className="text-muted-foreground">Time:</span>{' '}
            {new Date(lastPing.time).toLocaleTimeString()}
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground">Waiting for events...</p>
      )}
    </div>
  );
}
