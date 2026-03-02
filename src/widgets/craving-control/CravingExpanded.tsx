import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  X,
  Clock,
  Trophy,
  TrendingUp,
  Flame,
  Pencil,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import type { WidgetViewProps } from '@/lib/widget-sdk/types';
import { useLayoutStore } from '@/lib/store/layout-store';
import { computeStats } from './types';
import type { CravingEvent, CravingStats } from './types';

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function localDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayLabel(date: Date): string {
  return date.toLocaleDateString([], { weekday: 'short' });
}

export function CravingExpanded({ ctx }: WidgetViewProps) {
  const [events, setEvents] = useState<CravingEvent[]>([]);
  const [stats, setStats] = useState<CravingStats>({
    totalResisted: 0,
    totalFailed: 0,
    dayStreak: 0,
    longestStreak: 0,
    avgResistTime: 0,
    successRate: 0,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const collapseWidget = useLayoutStore((s) => s.collapseWidget);

  // Settings
  const inhale = (ctx.settings.get('breathingInhale') as number) ?? 4;
  const hold = (ctx.settings.get('breathingHold') as number) ?? 4;
  const exhale = (ctx.settings.get('breathingExhale') as number) ?? 6;
  const cycles = (ctx.settings.get('breathingCycles') as number) ?? 5;

  const [sInhale, setSInhale] = useState(inhale);
  const [sHold, setSHold] = useState(hold);
  const [sExhale, setSExhale] = useState(exhale);
  const [sCycles, setSCycles] = useState(cycles);

  const loadEvents = useCallback(async () => {
    const stored = (await ctx.db.get('craving-events')) as CravingEvent[] | undefined;
    const evts = stored ?? [];
    setEvents(evts);
    setStats(computeStats(evts));
  }, [ctx]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const saveNotes = useCallback(
    async (id: string, notes: string) => {
      const updated = events.map((e) => (e.id === id ? { ...e, notes } : e));
      setEvents(updated);
      await ctx.db.set('craving-events', updated);
      setEditingId(null);
    },
    [ctx, events],
  );

  const saveSettings = useCallback(async () => {
    await ctx.settings.set('breathingInhale', sInhale);
    await ctx.settings.set('breathingHold', sHold);
    await ctx.settings.set('breathingExhale', sExhale);
    await ctx.settings.set('breathingCycles', sCycles);
  }, [ctx, sInhale, sHold, sExhale, sCycles]);

  // History: only resisted/failed, reverse chronological
  const historyEvents = events
    .filter((e) => e.outcome === 'resisted' || e.outcome === 'failed')
    .reverse();

  // Chart data: last 7 days
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const date = daysAgo(6 - i);
    const dateStr = localDateStr(date);
    const dayEvents = events.filter((e) => {
      const eDate = localDateStr(new Date(e.timestamp));
      return eDate === dateStr && (e.outcome === 'resisted' || e.outcome === 'failed');
    });
    return {
      label: dayLabel(date),
      resisted: dayEvents.filter((e) => e.outcome === 'resisted').length,
      failed: dayEvents.filter((e) => e.outcome === 'failed').length,
    };
  });

  const maxBar = Math.max(1, ...last7.map((d) => d.resisted + d.failed));

  return (
    <div className="flex flex-col h-full p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={collapseWidget}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Craving Control</h1>
      </div>

      <Tabs defaultValue="history" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mb-4">
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="flex-1 min-h-0">
          <ScrollArea className="h-full pr-3">
            {historyEvents.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                No craving events yet. Press &quot;I have a craving&quot; to start tracking.
              </p>
            ) : (
              <div className="space-y-2">
                {historyEvents.map((event) => {
                  const date = new Date(event.timestamp);
                  const isResisted = event.outcome === 'resisted';
                  const isEditing = editingId === event.id;

                  return (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                    >
                      <div
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                          isResisted
                            ? 'bg-green-500/20 text-green-500'
                            : 'bg-red-500/20 text-red-500'
                        }`}
                      >
                        {isResisted ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {isResisted ? 'Resisted' : 'Failed'}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {formatDate(date)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{formatTime(date)}</span>
                        </div>

                        {event.duration && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Duration: {formatDuration(event.duration)}
                          </p>
                        )}

                        {isEditing ? (
                          <div className="mt-2 flex gap-2">
                            <Textarea
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              placeholder="Add a note..."
                              className="text-xs min-h-[60px]"
                            />
                            <div className="flex flex-col gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => saveNotes(event.id, editNotes)}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-1 mt-1">
                            {event.notes ? (
                              <p className="text-xs text-muted-foreground italic">{event.notes}</p>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 shrink-0"
                              onClick={() => {
                                setEditingId(event.id);
                                setEditNotes(event.notes ?? '');
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* STATISTICS TAB */}
        <TabsContent value="statistics" className="flex-1 min-h-0">
          <ScrollArea className="h-full pr-3">
            <div className="space-y-6">
              {/* Stat cards */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon={<Check className="h-4 w-4 text-green-500" />}
                  label="Resisted"
                  value={stats.totalResisted}
                />
                <StatCard
                  icon={<X className="h-4 w-4 text-red-500" />}
                  label="Failed"
                  value={stats.totalFailed}
                />
                <StatCard
                  icon={<Flame className="h-4 w-4 text-orange-500" />}
                  label="Current streak"
                  value={`${stats.dayStreak}d`}
                />
                <StatCard
                  icon={<Trophy className="h-4 w-4 text-yellow-500" />}
                  label="Longest streak"
                  value={`${stats.longestStreak}d`}
                />
                <StatCard
                  icon={<Clock className="h-4 w-4 text-blue-500" />}
                  label="Avg resist time"
                  value={stats.avgResistTime > 0 ? formatDuration(stats.avgResistTime) : '—'}
                />
                <StatCard
                  icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
                  label="Success rate"
                  value={stats.successRate > 0 ? `${stats.successRate}%` : '—'}
                />
              </div>

              {/* 7-day chart */}
              <div>
                <h3 className="text-sm font-medium mb-3">Last 7 days</h3>
                <div className="flex items-end gap-2" style={{ height: 128 }}>
                  {last7.map((day, i) => {
                    const total = day.resisted + day.failed;
                    const barHeight = total > 0 ? Math.round((total / maxBar) * 96) : 0;
                    const resistedHeight =
                      total > 0 ? Math.round((day.resisted / total) * barHeight) : 0;
                    const failedHeight = barHeight - resistedHeight;

                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col justify-end" style={{ height: 96 }}>
                          {total > 0 && (
                            <div className="w-full rounded-t-sm overflow-hidden flex flex-col">
                              {resistedHeight > 0 && (
                                <div
                                  className="bg-green-500/80 w-full"
                                  style={{ height: resistedHeight }}
                                />
                              )}
                              {failedHeight > 0 && (
                                <div
                                  className="bg-red-500/60 w-full"
                                  style={{ height: failedHeight }}
                                />
                              )}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground">{day.label}</span>
                        {total > 0 && (
                          <span className="text-[10px] font-medium">{total}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm bg-green-500/80" />
                    Resisted
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm bg-red-500/60" />
                    Failed
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings" className="flex-1 min-h-0">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Breathing Exercise</h3>
            <div className="grid grid-cols-2 gap-3">
              <SettingField
                label="Inhale (seconds)"
                value={sInhale}
                onChange={setSInhale}
              />
              <SettingField
                label="Hold (seconds)"
                value={sHold}
                onChange={setSHold}
              />
              <SettingField
                label="Exhale (seconds)"
                value={sExhale}
                onChange={setSExhale}
              />
              <SettingField
                label="Cycles"
                value={sCycles}
                onChange={setSCycles}
              />
            </div>
            <Button onClick={saveSettings} className="w-full">
              Save Settings
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      {icon}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}

function SettingField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input
        type="number"
        min={1}
        max={60}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 1)}
      />
    </div>
  );
}
