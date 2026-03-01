import { useState } from 'react';
import { Plus, Settings as SettingsIcon, Trash2, Pencil, House, icons, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDashboardStore } from '@/lib/store/dashboard-store';
import { DashboardDialog } from './DashboardDialog';

const iconsRecord = icons as Record<string, LucideIcon>;

export function Sidebar() {
  const dashboards = useDashboardStore((s) => s.dashboards);
  const activeId = useDashboardStore((s) => s.activeId);
  const setActive = useDashboardStore((s) => s.setActive);
  const createDashboard = useDashboardStore((s) => s.create);
  const renameDashboard = useDashboardStore((s) => s.rename);
  const removeDashboard = useDashboardStore((s) => s.remove);

  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [targetDashboard, setTargetDashboard] = useState<{ id: string; name: string; icon: string } | null>(null);

  // Controlled context menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  function handleCreate(name: string, icon: string): void {
    createDashboard(name, icon).then((d) => setActive(d.id));
  }

  function handleRename(name: string, icon: string): void {
    if (targetDashboard) {
      renameDashboard(targetDashboard.id, name, icon);
    }
  }

  function handleDelete(): void {
    if (targetDashboard) {
      removeDashboard(targetDashboard.id);
      setDeleteOpen(false);
    }
  }

  return (
    <>
      <aside className="flex h-full w-14 flex-col items-center border-r border-border bg-sidebar py-3">
        <nav className="flex flex-1 flex-col items-center gap-2">
          {dashboards.map((d) => {
            const Icon = iconsRecord[d.icon] ?? House;
            const isActive = d.id === activeId;
            return (
              <Tooltip key={d.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
                    }
                    onClick={() => setActive(d.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setTargetDashboard({ id: d.id, name: d.name, icon: d.icon });
                      setMenuPos({ x: e.clientX, y: e.clientY });
                      setMenuOpen(true);
                    }}
                  >
                    <Icon className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{d.name}</TooltipContent>
              </Tooltip>
            );
          })}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">New Dashboard</TooltipContent>
          </Tooltip>
        </nav>

        <div className="flex flex-col items-center gap-2 pb-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
              >
                <SettingsIcon className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
        </div>
      </aside>

      {/* Right-click context menu (positioned at cursor) */}
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuContent
          style={{ position: 'fixed', left: menuPos.x, top: menuPos.y }}
          side="right"
          align="start"
        >
          <DropdownMenuItem
            onClick={() => {
              setRenameOpen(true);
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>
          {dashboards.length > 1 && (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                setDeleteOpen(true);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DashboardDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        onSubmit={handleCreate}
      />

      <DashboardDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        mode="rename"
        initialName={targetDashboard?.name}
        initialIcon={targetDashboard?.icon}
        onSubmit={handleRename}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dashboard</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{targetDashboard?.name}&quot;? All widgets on
              this dashboard will be removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
