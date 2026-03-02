import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import type { WidgetViewProps } from '@/lib/widget-sdk/types';

interface Task {
  id: string;
  title: string;
  isCompleted: boolean;
  dueDate: string;
  createdAt: string;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export function DailyTasksCompact({ ctx }: WidgetViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const loadTasks = useCallback(async () => {
    const stored = (await ctx.db.get('tasks')) as Task[] | undefined;
    if (stored) {
      const today = todayStr();
      setTasks(stored.filter((t) => t.dueDate === today));
    }
  }, [ctx]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const saveTasks = useCallback(
    async (updated: Task[]) => {
      // Load all tasks, replace today's, save back
      const allStored = ((await ctx.db.get('tasks')) as Task[] | undefined) ?? [];
      const today = todayStr();
      const otherDays = allStored.filter((t) => t.dueDate !== today);
      await ctx.db.set('tasks', [...otherDays, ...updated]);
    },
    [ctx],
  );

  const addTask = useCallback(async () => {
    const title = newTitle.trim();
    if (!title) return;

    const task: Task = {
      id: `task-${Date.now()}`,
      title,
      isCompleted: false,
      dueDate: todayStr(),
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
  }, [ctx, tasks, newTitle, saveTasks]);

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
    },
    [ctx, tasks, saveTasks],
  );

  const completed = tasks.filter((t) => t.isCompleted).length;

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{formatDate()}</span>
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
              <span
                className={`text-sm leading-tight ${
                  task.isCompleted ? 'line-through text-muted-foreground' : ''
                }`}
              >
                {task.title}
              </span>
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
