import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';

import { Button } from '@/components/ui/button';
import type { WidgetViewProps } from '@/lib/widget-sdk/types';
import { onSettingsChange } from '@/lib/widget-sdk/settings-cache';
import { normalizeUrl } from './utils';

const LOAD_TIMEOUT_MS = 8000;

export function WebWidgetCompact({ ctx }: WidgetViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [url, setUrl] = useState(() => {
    return normalizeUrl((ctx.settings.get('url') as string) ?? '');
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Listen for settings changes (user changes URL)
  useEffect(() => {
    return onSettingsChange(ctx.widgetId, () => {
      const newUrl = normalizeUrl((ctx.settings.get('url') as string) ?? '');
      setUrl(newUrl);
      setLoading(true);
      setError(false);
    });
  }, [ctx]);

  // Timeout: if iframe doesn't fire onLoad within LOAD_TIMEOUT_MS, assume blocked
  useEffect(() => {
    if (!loading) return;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError(true);
      }
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timeoutRef.current);
  }, [loading, url, refreshKey]);

  const handleLoad = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setLoading(false);
    setError(false);
  }, []);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    setError(false);
    setRefreshKey((k) => k + 1);
  }, []);

  const handleOpenInBrowser = useCallback(() => {
    openUrl(url);
  }, [url]);

  return (
    <div className="flex h-full w-full flex-col">
      {/* Toolbar */}
      <div className="flex h-7 shrink-0 items-center gap-1 border-b border-border px-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={handleRefresh}
          title="Refresh"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={handleOpenInBrowser}
          title="Open in browser"
        >
          <ExternalLink className="h-3 w-3" />
        </Button>
        <span className="flex-1 truncate px-1 text-[10px] text-muted-foreground">{url}</span>
      </div>

      {/* Iframe area */}
      <div className="relative flex-1">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-card p-4">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            <p className="text-center text-xs text-muted-foreground">
              This site may block embedding.
            </p>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleOpenInBrowser}>
              <ExternalLink className="mr-1.5 h-3 w-3" />
              Open in browser
            </Button>
          </div>
        )}

        <iframe
          key={`${url}-${refreshKey}`}
          src={url}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          referrerPolicy="no-referrer"
          className="h-full w-full border-0"
          onLoad={handleLoad}
        />
      </div>
    </div>
  );
}
