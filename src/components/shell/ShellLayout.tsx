import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { GridArea } from './GridArea';

export function ShellLayout() {
  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar activeDashboard="default" />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar dashboardName="Main" />
          <GridArea />
        </div>
      </div>
    </TooltipProvider>
  );
}
