import type { Task } from './types';

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

export function dayNum(dateStr: string): string {
  return dateStr.slice(8, 10).replace(/^0/, '');
}

export function weekDates(referenceDate?: string): string[] {
  const ref = referenceDate ? new Date(referenceDate + 'T12:00:00') : new Date();
  const day = ref.getDay();
  const monday = new Date(ref);
  monday.setDate(ref.getDate() - ((day + 6) % 7));
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export function generateRecurring(tasks: Task[], targetDate: string): Task[] {
  const targetIds = new Set(tasks.filter((t) => t.dueDate === targetDate).map((t) => t.title));
  const newTasks: Task[] = [];

  for (const task of tasks) {
    if (!task.recurring || task.recurring === 'none') continue;
    if (task.dueDate >= targetDate) continue;
    if (targetIds.has(task.title)) continue;

    if (task.recurring === 'daily') {
      newTasks.push({
        ...task,
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        dueDate: targetDate,
        isCompleted: false,
        createdAt: new Date().toISOString(),
      });
      targetIds.add(task.title);
    } else if (task.recurring === 'weekly') {
      const origDate = new Date(task.dueDate + 'T12:00:00');
      const tDate = new Date(targetDate + 'T12:00:00');
      if (origDate.getDay() === tDate.getDay()) {
        newTasks.push({
          ...task,
          id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          dueDate: targetDate,
          isCompleted: false,
          createdAt: new Date().toISOString(),
        });
        targetIds.add(task.title);
      }
    }
  }

  return [...tasks, ...newTasks];
}
