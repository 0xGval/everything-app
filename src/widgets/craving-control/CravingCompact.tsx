import { useCallback, useEffect, useState } from 'react';
import { Wind, Flame, Trophy, RotateCcw, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { Button } from '@/components/ui/button';
import type { WidgetViewProps } from '@/lib/widget-sdk/types';
import { BreathingExercise } from './BreathingExercise';
import { computeStats } from './types';
import type { CravingEvent, CravingStats } from './types';

type ViewState = 'idle' | 'breathing' | 'complete';

export function CravingCompact({ ctx }: WidgetViewProps) {
  const [events, setEvents] = useState<CravingEvent[]>([]);
  const [stats, setStats] = useState<CravingStats>({
    totalResisted: 0,
    totalFailed: 0,
    dayStreak: 0,
    longestStreak: 0,
    avgResistTime: 0,
    successRate: 0,
  });
  const [view, setView] = useState<ViewState>('idle');
  const [startedAt, setStartedAt] = useState<string>('');

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

  const updateAndSave = useCallback(
    async (updated: CravingEvent[]) => {
      setEvents(updated);
      await ctx.db.set('craving-events', updated);
      const computed = computeStats(updated);
      setStats(computed);
      ctx.sharedState.write('craving:stats', computed);
    },
    [ctx],
  );

  const handleCraving = useCallback(async () => {
    const now = new Date().toISOString();
    const event: CravingEvent = {
      id: `craving-${Date.now()}`,
      timestamp: now,
      outcome: 'started',
    };

    await updateAndSave([...events, event]);
    ctx.emit('craving:started', { timestamp: now });
    setStartedAt(now);
    setView('breathing');
  }, [ctx, events, updateAndSave]);

  const handleBreathingComplete = useCallback(() => {
    setView('complete');
  }, []);

  const handleResisted = useCallback(async () => {
    const duration = Math.round((Date.now() - new Date(startedAt).getTime()) / 1000);
    const event: CravingEvent = {
      id: `craving-${Date.now()}`,
      timestamp: new Date().toISOString(),
      outcome: 'resisted',
      duration,
    };

    await updateAndSave([...events, event]);
    ctx.emit('craving:resisted', { timestamp: event.timestamp, duration });
    setView('idle');
  }, [ctx, events, startedAt, updateAndSave]);

  const handleNotYet = useCallback(() => {
    // Offer another round
    setView('breathing');
  }, []);

  const handleGiveUp = useCallback(async () => {
    const duration = Math.round((Date.now() - new Date(startedAt).getTime()) / 1000);
    const event: CravingEvent = {
      id: `craving-${Date.now()}`,
      timestamp: new Date().toISOString(),
      outcome: 'failed',
      duration,
    };

    await updateAndSave([...events, event]);
    ctx.emit('craving:failed', { timestamp: event.timestamp, duration });
    setView('idle');
  }, [ctx, events, startedAt, updateAndSave]);

  // Read settings
  const inhale = (ctx.settings.get('breathingInhale') as number) ?? 4;
  const hold = (ctx.settings.get('breathingHold') as number) ?? 4;
  const exhale = (ctx.settings.get('breathingExhale') as number) ?? 6;
  const cycles = (ctx.settings.get('breathingCycles') as number) ?? 5;

  return (
    <div className="flex flex-col h-full p-2">
      <AnimatePresence mode="wait">
        {view === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center gap-3 h-full"
          >
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
          </motion.div>
        )}

        {view === 'breathing' && (
          <motion.div
            key="breathing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="h-full"
          >
            <BreathingExercise
              inhale={inhale}
              hold={hold}
              exhale={exhale}
              cycles={cycles}
              onComplete={handleBreathingComplete}
            />
          </motion.div>
        )}

        {view === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center gap-3 h-full"
          >
            <p className="text-sm font-medium text-center">Did the craving pass?</p>

            <Button className="w-full gap-2" onClick={handleResisted}>
              <Wind className="h-4 w-4" />
              Yes, I resisted!
            </Button>

            <Button variant="outline" className="w-full gap-2" onClick={handleNotYet}>
              <RotateCcw className="h-4 w-4" />
              Not yet, try again
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground gap-1.5"
              onClick={handleGiveUp}
            >
              <X className="h-3.5 w-3.5" />
              Give up
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
