import { useEffect, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';

import type { WidgetViewProps } from '@/lib/widget-sdk/types';
import { onSettingsChange } from '@/lib/widget-sdk/settings-cache';

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return 'https://example.com';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function WebWidgetCompact({ ctx }: WidgetViewProps) {
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState(() => {
    return normalizeUrl((ctx.settings.get('url') as string) ?? '');
  });

  // Listen for settings changes (user changes URL)
  useEffect(() => {
    return onSettingsChange(ctx.widgetId, () => {
      const newUrl = normalizeUrl((ctx.settings.get('url') as string) ?? '');
      setUrl(newUrl);
      setLoading(true);
    });
  }, [ctx]);

  return (
    <div className="flex h-full w-full flex-col">
      {/* Iframe area */}
      <div className="relative flex-1">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        <iframe
          key={url}
          src={url}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          referrerPolicy="no-referrer"
          className="h-full w-full border-0"
          onLoad={() => setLoading(false)}
        />
      </div>

      {/* Bottom bar — always visible */}
      <div className="flex h-6 shrink-0 items-center justify-between border-t border-border px-2">
        <span className="truncate text-[10px] text-muted-foreground">{url}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 shrink-0 text-muted-foreground hover:text-foreground"
          title="Open in browser"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
