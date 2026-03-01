import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';

function App() {
  const [greetMsg, setGreetMsg] = useState('');
  const [name, setName] = useState('');
  const [isDark, setIsDark] = useState(false);

  async function greet(): Promise<void> {
    setGreetMsg(await invoke('greet', { name }));
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
      <p className="text-muted-foreground">Tauri 2 + React 18 + TailwindCSS 4 + shadcn/ui</p>

      <div className="flex gap-3">
        <Button variant="default" onClick={toggleTheme}>
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </Button>
        <Button variant="outline" onClick={greet}>
          Greet from Rust
        </Button>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
          value={name}
        />
      </form>

      {greetMsg && (
        <p className="rounded-lg bg-card p-4 text-card-foreground shadow">{greetMsg}</p>
      )}
    </main>
  );
}

export default App;
