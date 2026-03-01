import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';

interface Dashboard {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
  createdAt: string;
}

function App() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [dbStatus, setDbStatus] = useState<string>('loading...');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    loadDashboards();
  }, []);

  async function loadDashboards(): Promise<void> {
    try {
      const result = await invoke<Dashboard[]>('get_dashboards');
      setDashboards(result);
      setDbStatus(`OK — ${result.length} dashboard(s) loaded`);
      console.log('dashboards:', result);
    } catch (e) {
      setDbStatus(`Error: ${e}`);
      console.error('get_dashboards failed:', e);
    }
  }

  async function createTestDashboard(): Promise<void> {
    try {
      const id = `test-${Date.now()}`;
      await invoke('create_dashboard', {
        input: {
          id,
          name: 'Test Dashboard',
          icon: 'star',
          sortOrder: dashboards.length,
        },
      });
      await loadDashboards();
    } catch (e) {
      console.error('create_dashboard failed:', e);
    }
  }

  function toggleTheme(): void {
    setIsDark((prev) => {
      document.documentElement.classList.toggle('dark', !prev);
      return !prev;
    });
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8 text-foreground">
      <h1 className="text-3xl font-bold">Everything App</h1>
      <p className="text-muted-foreground">Phase 1.2 — Database Verification</p>

      <div className="rounded-lg border border-border bg-card p-4 text-sm">
        <p>
          <span className="font-medium">DB Status:</span> {dbStatus}
        </p>
      </div>

      {dashboards.length > 0 && (
        <div className="w-full max-w-md space-y-2">
          <p className="text-sm font-medium">Dashboards:</p>
          {dashboards.map((d) => (
            <div key={d.id} className="rounded-md border border-border bg-card p-3 text-sm">
              <span className="font-mono">{d.id}</span> — {d.name} ({d.icon})
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="default" onClick={createTestDashboard}>
          Create Test Dashboard
        </Button>
        <Button variant="outline" onClick={loadDashboards}>
          Reload Dashboards
        </Button>
        <Button variant="ghost" onClick={toggleTheme}>
          {isDark ? 'Light' : 'Dark'}
        </Button>
      </div>
    </main>
  );
}

export default App;
