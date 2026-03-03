import { useCallback, useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useShortcutsStore } from '@/lib/store/shortcuts-store';

interface AppSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppSettingsDialog({ open, onOpenChange }: AppSettingsDialogProps) {
  const shortcuts = useShortcutsStore((s) => s.shortcuts);
  const rebind = useShortcutsStore((s) => s.rebind);
  const reset = useShortcutsStore((s) => s.reset);
  const resetAll = useShortcutsStore((s) => s.resetAll);

  const [recording, setRecording] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);

  // Listen for key combos while recording
  useEffect(() => {
    if (!recording) return;

    function handleKeyDown(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();

      // Ignore bare modifier keys
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
      if (e.shiftKey) parts.push('Shift');
      if (e.altKey) parts.push('Alt');

      // Escape cancels recording
      if (e.key === 'Escape' && parts.length === 0) {
        setRecording(null);
        setConflict(null);
        return;
      }

      const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      parts.push(key);
      const binding = parts.join('+');

      // Check for conflicts
      const existing = shortcuts.find((s) => s.id !== recording && s.binding === binding);
      if (existing) {
        setConflict(`"${binding}" is already used by "${existing.label}"`);
        return;
      }

      setConflict(null);
      rebind(recording!, binding);
      setRecording(null);
    }

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [recording, shortcuts, rebind]);

  // Reset recording state when dialog closes
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setRecording(null);
        setConflict(null);
      }
      onOpenChange(open);
    },
    [onOpenChange],
  );

  // Group shortcuts
  const groups = new Map<string, typeof shortcuts>();
  for (const s of shortcuts) {
    const list = groups.get(s.group) ?? [];
    list.push(s);
    groups.set(s.group, list);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>Click a shortcut to rebind it. Press Escape to cancel.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          <div className="flex flex-col gap-4 pr-4">
            {Array.from(groups.entries()).map(([group, items]) => (
              <div key={group}>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {group}
                </h3>
                <div className="flex flex-col gap-1">
                  {items.map((s) => {
                    const isRecording = recording === s.id;
                    const isModified = s.binding !== s.defaultBinding;

                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50"
                      >
                        <span className="text-sm">{s.label}</span>
                        <div className="flex items-center gap-1.5">
                          {isModified && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              title="Reset to default"
                              onClick={() => reset(s.id)}
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          )}
                          <button
                            className={`rounded border px-2 py-0.5 text-xs font-mono transition-colors ${
                              isRecording
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border bg-muted/50 text-foreground hover:border-primary/50'
                            }`}
                            onClick={() => {
                              setRecording(isRecording ? null : s.id);
                              setConflict(null);
                            }}
                          >
                            {isRecording ? 'Press keys...' : s.binding}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {conflict && (
          <p className="text-xs text-destructive">{conflict}</p>
        )}

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={resetAll}>
            Reset All to Defaults
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
