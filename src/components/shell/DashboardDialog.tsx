import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { icons, type LucideIcon } from 'lucide-react';

const iconsRecord = icons as Record<string, LucideIcon>;

const ICON_OPTIONS = [
  'House', 'Briefcase', 'Heart', 'Star', 'Zap', 'Coffee',
  'Music', 'BookOpen', 'Dumbbell', 'Gamepad2', 'Palette', 'Code',
];

interface DashboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'rename';
  initialName?: string;
  initialIcon?: string;
  onSubmit: (name: string, icon: string) => void;
}

export function DashboardDialog({
  open,
  onOpenChange,
  mode,
  initialName = '',
  initialIcon = 'Home',
  onSubmit,
}: DashboardDialogProps) {
  const [name, setName] = useState(initialName);
  const [selectedIcon, setSelectedIcon] = useState(initialIcon);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setSelectedIcon(initialIcon);
    }
  }, [open, initialName, initialIcon]);

  function handleSubmit(): void {
    if (!name.trim()) return;
    onSubmit(name.trim(), selectedIcon);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'New Dashboard' : 'Rename Dashboard'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dashboard-name">Name</Label>
            <Input
              id="dashboard-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dashboard name"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Icon</Label>
            <div className="grid grid-cols-6 gap-1.5">
              {ICON_OPTIONS.map((iconName) => {
                const Icon = iconsRecord[iconName];
                return (
                  <Button
                    key={iconName}
                    variant={selectedIcon === iconName ? 'default' : 'outline'}
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setSelectedIcon(iconName)}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            {mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
