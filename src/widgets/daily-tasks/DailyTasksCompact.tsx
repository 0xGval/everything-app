import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { WidgetViewProps } from '@/lib/widget-sdk/types';
import type { Task } from './types';
import { CATEGORY_COLORS } from './types';
import { todayStr, formatDateDisplay } from './utils';

export function DailyTasksCompact({ ctx }: WidgetViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const today = todayStr();

  const loadTasks = useCallback(async () => {
    const stored = (await ctx.db.get('tasks')) as Task[] | undefined;
    if (stored) {
      setTasks(stored.filter((t) => t.dueDate === today));
    }
  }, [ctx, today]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Listen for craving:resisted → auto-complete a "Manage craving today" health task with counter
  useEffect(() => {
    const CRAVING_TASK_BASE = 'Manage craving today';

    const unsub = ctx.on('craving:resisted', async () => {
      const allStored = ((await ctx.db.get('tasks')) as Task[] | undefined) ?? [];

      // Find existing craving task for today (title starts with base)
      const existing = allStored.find(
        (t) => t.dueDate === today && t.title.startsWith(CRAVING_TASK_BASE),
      );

      let updated: Task[];

      if (existing) {
        // Extract current count and increment
        const match = existing.title.match(/\(\u00d7(\d+)\)$/);
        const count = match ? parseInt(match[1], 10) + 1 : 2;
        const newTitle = `${CRAVING_TASK_BASE} (\u00d7${count})`;

        updated = allStored.map((t) =>
          t.id === existing.id ? { ...t, title: newTitle, isCompleted: true } : t,
        );
      } else {
        // Create a new craving task
        const newTask: Task = {
          id: `task-${Date.now()}`,
          title: CRAVING_TASK_BASE,
          isCompleted: true,
          dueDate: today,
          createdAt: new Date().toISOString(),
          category: 'Health',
          recurring: 'daily',
        };
        updated = [...allStored, newTask];
      }

      await ctx.db.set('tasks', updated);

      // Refresh local state
      setTasks(updated.filter((t) => t.dueDate === today));

      const completedCount = updated.filter((t) => t.dueDate === today && t.isCompleted).length;
      const totalCount = updated.filter((t) => t.dueDate === today).length;
      ctx.sharedState.write('tasks:today', { total: totalCount, completed: completedCount });

      toast.success('Craving resisted! Task completed.');
    });

    return unsub;
  }, [ctx, today]);

  const saveTasks = useCallback(
    async (updated: Task[]) => {
      // Load all tasks, replace today's, save back
      const allStored = ((await ctx.db.get('tasks')) as Task[] | undefined) ?? [];
      const otherDays = allStored.filter((t) => t.dueDate !== today);
      await ctx.db.set('tasks', [...otherDays, ...updated]);
    },
    [ctx, today],
  );

  const addTask = useCallback(async () => {
    const title = newTitle.trim();
    if (!title) return;

    const task: Task = {
      id: `task-${Date.now()}`,
      title,
      isCompleted: false,
      dueDate: today,
      createdAt: new Date().toISOString(),
    };

    const updated = [...tasks, task];
    setTasks(updated);
    setNewTitle('');
    await saveTasks(updated);
    ctx.emit('task:created', { id: task.id, title: task.title });

    // Update shared state
    const completed = updated.filter((t) => t.isCompleted).length;
    ctx.sharedState.write('tasks:today', { total: updated.length, completed });
  }, [ctx, tasks, newTitle, today, saveTasks]);

  const toggleTask = useCallback(
    async (taskId: string) => {
      const updated = tasks.map((t) =>
        t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t,
      );
      setTasks(updated);
      await saveTasks(updated);

      const toggled = updated.find((t) => t.id === taskId);
      if (toggled?.isCompleted) {
        ctx.emit('task:completed', { id: toggled.id, title: toggled.title });
      }

      const completed = updated.filter((t) => t.isCompleted).length;
      ctx.sharedState.write('tasks:today', { total: updated.length, completed });

      // Notify when all tasks are done
      if (updated.length > 0 && completed === updated.length) {
        ctx.notify('All Done!', 'You completed all your tasks for today!');
      }
    },
    [ctx, tasks, saveTasks],
  );

  const completed = tasks.filter((t) => t.isCompleted).length;

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {formatDateDisplay(today)}
        </span>
        <span className="text-xs text-muted-foreground">
          {completed}/{tasks.length}
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="flex flex-col gap-1">
          {tasks.map((task) => (
            <label
              key={task.id}
              className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-muted/50 cursor-pointer"
            >
              <Checkbox
                checked={task.isCompleted}
                onCheckedChange={() => toggleTask(task.id)}
              />
              {task.category && (
                <span
                  className={cn(
                    'h-1.5 w-1.5 shrink-0 rounded-full',
                    CATEGORY_COLORS[task.category] ?? 'bg-muted-foreground',
                  )}
                />
              )}
              <span
                className={cn(
                  'text-sm leading-tight flex-1 min-w-0 truncate',
                  task.isCompleted && 'line-through text-muted-foreground',
                )}
              >
                {task.title}
              </span>
              {task.recurring && task.recurring !== 'none' && (
                <Repeat className="h-3 w-3 shrink-0 text-muted-foreground" />
              )}
            </label>
          ))}
          {tasks.length === 0 && (
            <p className="py-2 text-center text-xs text-muted-foreground">
              No tasks yet. Add one below!
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          placeholder="Add a task..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addTask();
          }}
          className="h-7 text-sm"
        />
        <button
          onClick={addTask}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
