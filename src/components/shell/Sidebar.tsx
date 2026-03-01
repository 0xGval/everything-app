import { Home, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SidebarProps {
  activeDashboard: string;
}

const dashboards = [{ id: 'default', name: 'Main', icon: Home }];

export function Sidebar({ activeDashboard }: SidebarProps) {
  return (
    <aside className="flex h-full w-14 flex-col items-center border-r border-border bg-sidebar py-3">
      <nav className="flex flex-1 flex-col items-center gap-2">
        {dashboards.map((d) => {
          const Icon = d.icon;
          const isActive = d.id === activeDashboard;
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
                >
                  <Icon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{d.name}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-2 pb-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Settings</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
