export interface Task {
  id: string;
  title: string;
  isCompleted: boolean;
  dueDate: string;
  createdAt: string;
  category?: string;
  notes?: string;
  recurring?: 'none' | 'daily' | 'weekly';
}

export const CATEGORIES = ['Personal', 'Work', 'Health', 'Learning'] as const;

export const RECURRING_OPTIONS = [
  { value: 'none', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  Personal: 'bg-blue-500',
  Work: 'bg-amber-500',
  Health: 'bg-green-500',
  Learning: 'bg-purple-500',
};
