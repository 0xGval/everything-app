import { useCallback, useEffect, useState } from 'react';
import { Wind, Flame, Trophy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { WidgetViewProps } from '@/lib/widget-sdk/types';

interface CravingEvent {
  id: string;
  timestamp: string;
  outcome: 'started' | 'resisted' | 'failed';
  duration?: number;
  notes?: string;
}

interface CravingStats {
  totalResisted: number;
  dayStreak: number;
}

function computeStats(events: CravingEvent[]): CravingStats {
  const resisted = events.filter((e) => e.outcome === 'resisted');
  const totalResisted = resisted.length;

  // Compute day streak: consecutive days (ending today or yesterday) with at least one resisted event
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const resistedDays = new Set(
    resisted.map((e) => {
      const d = new Date(e.timestamp);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }),
  );

  let dayStreak = 0;
  const oneDay = 86_400_000;
  let checkDate = today.getTime();

  // If no resisted event today, check if yesterday had one (streak may still be active)
  if (!resistedDays.has(checkDate)) {
    checkDate -= oneDay;
  }

  while (resistedDays.has(checkDate)) {
    dayStreak++;
    checkDate -= oneDay;
  }

  return { totalResisted, dayStreak };
}

export function CravingCompact({ ctx }: WidgetViewProps) {
  const [events, setEvents] = useState<CravingEvent[]>([]);
  const [stats, setStats] = useState<CravingStats>({ totalResisted: 0, dayStreak: 0 });

  const loadEvents = useCallback(async () => {
    const stored = (await ctx.db.get('craving-events')) as CravingEvent[] | undefined;
    const evts = stored ?? [];
    setEvents(evts);
    const computed = computeStats(evts);
    setStats(computed);
    ctx.sharedState.write('craving:stats', computed);
  }, [ctx]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleCraving = useCallback(async () => {
    const event: CravingEvent = {
      id: `craving-${Date.now()}`,
      timestamp: new Date().toISOString(),
      outcome: 'started',
    };

    const updated = [...events, event];
    setEvents(updated);
    await ctx.db.set('craving-events', updated);
    ctx.emit('craving:started', { timestamp: event.timestamp });
  }, [ctx, events]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-2 h-full">
      <Button
        size="lg"
        className="w-full gap-2 text-base font-semibold"
        variant="destructive"
        onClick={handleCraving}
      >
        <Flame className="h-5 w-5" />
        I have a craving
      </Button>

      <div className="flex w-full items-center justify-around text-center">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Wind className="h-3.5 w-3.5" />
            <span className="text-xs">Resisted</span>
          </div>
          <span className="text-xl font-bold">{stats.totalResisted}</span>
        </div>

        <div className="h-8 w-px bg-border" />

        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Trophy className="h-3.5 w-3.5" />
            <span className="text-xs">Day streak</span>
          </div>
          <span className="text-xl font-bold">{stats.dayStreak}</span>
        </div>
      </div>
    </div>
  );
}
