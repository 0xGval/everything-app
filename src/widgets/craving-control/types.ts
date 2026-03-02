export interface CravingEvent {
  id: string;
  timestamp: string;
  outcome: 'started' | 'resisted' | 'failed';
  duration?: number;
  notes?: string;
}

export interface CravingStats {
  totalResisted: number;
  totalFailed: number;
  dayStreak: number;
  longestStreak: number;
  avgResistTime: number;
  successRate: number;
}

export function computeStats(events: CravingEvent[]): CravingStats {
  const resisted = events.filter((e) => e.outcome === 'resisted');
  const failed = events.filter((e) => e.outcome === 'failed');
  const totalResisted = resisted.length;
  const totalFailed = failed.length;
  const total = totalResisted + totalFailed;

  // Success rate
  const successRate = total > 0 ? Math.round((totalResisted / total) * 100) : 0;

  // Average resist time
  const resistDurations = resisted.filter((e) => e.duration).map((e) => e.duration!);
  const avgResistTime =
    resistDurations.length > 0
      ? Math.round(resistDurations.reduce((a, b) => a + b, 0) / resistDurations.length)
      : 0;

  // Day streaks
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const oneDay = 86_400_000;

  const resistedDays = new Set(
    resisted.map((e) => {
      const d = new Date(e.timestamp);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }),
  );

  // Current streak
  let dayStreak = 0;
  let checkDate = today.getTime();
  if (!resistedDays.has(checkDate)) {
    checkDate -= oneDay;
  }
  while (resistedDays.has(checkDate)) {
    dayStreak++;
    checkDate -= oneDay;
  }

  // Longest streak
  const sortedDays = Array.from(resistedDays).sort((a, b) => a - b);
  let longestStreak = 0;
  let currentRun = 0;
  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0 || sortedDays[i] - sortedDays[i - 1] === oneDay) {
      currentRun++;
    } else {
      currentRun = 1;
    }
    longestStreak = Math.max(longestStreak, currentRun);
  }

  return { totalResisted, totalFailed, dayStreak, longestStreak, avgResistTime, successRate };
}
