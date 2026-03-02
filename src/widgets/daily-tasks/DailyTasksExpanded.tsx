import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { WidgetViewProps } from '@/lib/widget-sdk/types';
import type { Task } from './types';
import { CATEGORIES, CATEGORY_COLORS, RECURRING_OPTIONS } from './types';
import {
  todayStr,
  formatDateDisplay,
  dayLabel,
  dayNum,
  weekDates,
  generateRecurring,
} from './utils';

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function DailyTasksExpanded({ ctx }: WidgetViewProps) {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newRecurring, setNewRecurring] = useState<'none' | 'daily' | 'weekly'>('none');
  const [newDueDate, setNewDueDate] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editRecurring, setEditRecurring] = useState<'none' | 'daily' | 'weekly'>('none');
  const [selectedDate, setSelectedDate] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);

  const today = todayStr();

  // Initialize selectedDate and newDueDate on mount
  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(today);
      setNewDueDate(today);
    }
  }, [today, selectedDate]);

  // Compute the week based on offset from today
  const weekRef = useMemo(() => offsetDate(today, weekOffset * 7), [today, weekOffset]);
  const week = useMemo(() => weekDates(weekRef), [weekRef]);

  const loadAllTasks = useCallback(async () => {
    const stored = (await ctx.db.get('tasks')) as Task[] | undefined;
    if (stored) {
      // Generate recurring tasks for today if missing
      const updated = generateRecurring(stored, today);
      setAllTasks(updated);
      if (updated.length !== stored.length) {
        await ctx.db.set('tasks', updated);
      }
    }
  }, [ctx, today]);

  useEffect(() => {
    loadAllTasks();
  }, [loadAllTasks]);

  const saveTasks = useCallback(
    async (updated: Task[]) => {
      setAllTasks(updated);
      await ctx.db.set('tasks', updated);
      // Shared state always reports actual today's counts
      const todayTasks = updated.filter((t) => t.dueDate === today);
      const completed = todayTasks.filter((t) => t.isCompleted).length;
      ctx.sharedState.write('tasks:today', { total: todayTasks.length, completed });
    },
    [ctx, today],
  );

  const dateTasks = allTasks.filter((t) => t.dueDate === selectedDate);
  const filtered =
    activeCategory === 'All'
      ? dateTasks
      : dateTasks.filter((t) => (t.category ?? '') === activeCategory);

  const addTask = useCallback(async () => {
    const title = newTitle.trim();
    if (!title) return;

    const task: Task = {
      id: `task-${Date.now()}`,
      title,
      isCompleted: false,
      dueDate: newDueDate || selectedDate,
      createdAt: new Date().toISOString(),
      category: newCategory || undefined,
      recurring: newRecurring,
    };

    const updated = [...allTasks, task];
    setNewTitle('');
    await saveTasks(updated);
    ctx.emit('task:created', { id: task.id, title: task.title });
  }, [ctx, allTasks, newTitle, newCategory, newRecurring, newDueDate, selectedDate, saveTasks]);

  const toggleTask = useCallback(
    async (taskId: string) => {
      const updated = allTasks.map((t) =>
        t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t,
      );
      await saveTasks(updated);

      const toggled = updated.find((t) => t.id === taskId);
      if (toggled?.isCompleted) {
        ctx.emit('task:completed', { id: toggled.id, title: toggled.title });
      }
    },
    [ctx, allTasks, saveTasks],
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      const updated = allTasks.filter((t) => t.id !== taskId);
      await saveTasks(updated);
    },
    [allTasks, saveTasks],
  );

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditCategory(task.category ?? '');
    setEditNotes(task.notes ?? '');
    setEditRecurring(task.recurring ?? 'none');
  };

  const saveEdit = useCallback(async () => {
    if (!editingTask) return;
    const updated = allTasks.map((t) =>
      t.id === editingTask.id
        ? {
            ...t,
            title: editTitle,
            category: editCategory || undefined,
            notes: editNotes || undefined,
            recurring: editRecurring,
          }
        : t,
    );
    setEditingTask(null);
    await saveTasks(updated);
  }, [allTasks, editingTask, editTitle, editCategory, editNotes, editRecurring, saveTasks]);

  // Weekly overview counts
  const weekCounts = week.map((date) => {
    const dayTasks = allTasks.filter((t) => t.dueDate === date);
    return {
      date,
      total: dayTasks.length,
      completed: dayTasks.filter((t) => t.isCompleted).length,
    };
  });

  const completedCount = dateTasks.filter((t) => t.isCompleted).length;
  const isToday = selectedDate === today;

  // Sync newDueDate when selectedDate changes
  useEffect(() => {
    setNewDueDate(selectedDate);
  }, [selectedDate]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {/* Weekly overview with navigation */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Weekly Overview</h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setWeekOffset((o) => o - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                setWeekOffset(0);
                setSelectedDate(today);
              }}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setWeekOffset((o) => o + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weekCounts.map((w) => (
            <button
              key={w.date}
              onClick={() => setSelectedDate(w.date)}
              className={cn(
                'flex flex-col items-center rounded-md p-2 text-center transition-colors',
                w.date === selectedDate && 'bg-primary text-primary-foreground',
                w.date !== selectedDate && w.date === today && 'ring-1 ring-primary/40',
                w.date !== selectedDate && 'bg-muted/50 hover:bg-muted',
              )}
            >
              <span
                className={cn(
                  'text-xs',
                  w.date === selectedDate ? 'text-primary-foreground/70' : 'text-muted-foreground',
                )}
              >
                {dayLabel(w.date)}
              </span>
              <span className="text-sm font-medium">{dayNum(w.date)}</span>
              {w.total > 0 ? (
                <span
                  className={cn(
                    'text-xs',
                    w.date === selectedDate
                      ? 'text-primary-foreground/70'
                      : 'text-muted-foreground',
                  )}
                >
                  {w.completed}/{w.total}
                </span>
              ) : (
                <span
                  className={cn(
                    'text-xs',
                    w.date === selectedDate
                      ? 'text-primary-foreground/70'
                      : 'text-muted-foreground',
                  )}
                >
                  -
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Day header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">
            {isToday ? "Today's Tasks" : formatDateDisplay(selectedDate)}
          </h2>
          <span className="text-sm text-muted-foreground">
            {completedCount}/{dateTasks.length} completed
          </span>
        </div>
      </div>

      {/* Category tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList>
          <TabsTrigger value="All">All</TabsTrigger>
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat} value={cat} className="flex items-center gap-1.5">
              <span
                className={cn('h-2 w-2 rounded-full', CATEGORY_COLORS[cat] ?? 'bg-muted-foreground')}
              />
              {cat}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Task list */}
      <div className="flex flex-col gap-1">
        {filtered.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
          >
            <Checkbox
              checked={task.isCompleted}
              onCheckedChange={() => toggleTask(task.id)}
            />
            <span
              className={cn(
                'flex-1 text-sm',
                task.isCompleted && 'line-through text-muted-foreground',
              )}
            >
              {task.title}
            </span>
            {task.category && (
              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    CATEGORY_COLORS[task.category] ?? 'bg-muted-foreground',
                  )}
                />
                {task.category}
              </Badge>
            )}
            {task.recurring && task.recurring !== 'none' && (
              <Badge variant="outline" className="text-xs">
                {task.recurring}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => openEdit(task)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => deleteTask(task.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No tasks{activeCategory !== 'All' ? ` in ${activeCategory}` : ''}.
          </p>
        )}
      </div>

      {/* Add task form */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Add a task..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addTask();
          }}
          className="min-w-0 flex-1"
        />
        <input
          type="date"
          value={newDueDate}
          onChange={(e) => setNewDueDate(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        />
        <select
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">No category</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <select
          value={newRecurring}
          onChange={(e) => setNewRecurring(e.target.value as 'none' | 'daily' | 'weekly')}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {RECURRING_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Button size="sm" onClick={addTask}>
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Title</label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Category</label>
              <div className="flex flex-wrap gap-1">
                <Badge
                  variant={editCategory === '' ? 'default' : 'secondary'}
                  className="cursor-pointer"
                  onClick={() => setEditCategory('')}
                >
                  None
                </Badge>
                {CATEGORIES.map((cat) => (
                  <Badge
                    key={cat}
                    variant={editCategory === cat ? 'default' : 'secondary'}
                    className="cursor-pointer flex items-center gap-1"
                    onClick={() => setEditCategory(cat)}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        CATEGORY_COLORS[cat] ?? 'bg-muted-foreground',
                      )}
                    />
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Recurrence</label>
              <div className="flex flex-wrap gap-1">
                {RECURRING_OPTIONS.map((opt) => (
                  <Badge
                    key={opt.value}
                    variant={editRecurring === opt.value ? 'default' : 'secondary'}
                    className="cursor-pointer"
                    onClick={() => setEditRecurring(opt.value as 'none' | 'daily' | 'weekly')}
                  >
                    {opt.label}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Notes</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTask(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
