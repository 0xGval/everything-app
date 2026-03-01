import { useEffect } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { GridArea } from './GridArea';
import { useDashboardStore } from '@/lib/store/dashboard-store';
import { useLayoutStore } from '@/lib/store/layout-store';

export function ShellLayout() {
  const loadDashboards = useDashboardStore((s) => s.load);
  const dashboardLoaded = useDashboardStore((s) => s.loaded);
  const activeId = useDashboardStore((s) => s.activeId);
  const dashboards = useDashboardStore((s) => s.dashboards);
  const loadLayout = useLayoutStore((s) => s.loadLayout);

  useEffect(() => {
    loadDashboards();
  }, [loadDashboards]);

  useEffect(() => {
    if (activeId) {
      loadLayout(activeId);
    }
  }, [activeId, loadLayout]);

  const activeDashboard = dashboards.find((d) => d.id === activeId);

  if (!dashboardLoaded) return null;

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar dashboardName={activeDashboard?.name ?? 'Dashboard'} />
          <GridArea />
        </div>
      </div>
    </TooltipProvider>
  );
}
