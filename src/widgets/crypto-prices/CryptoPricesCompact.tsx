import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, TrendingDown, TrendingUp, WifiOff } from 'lucide-react';

import { ScrollArea } from '@/components/ui/scroll-area';
import type { WidgetViewProps } from '@/lib/widget-sdk/types';

import { useHyperliquidWs } from './use-hyperliquid-ws';
import {
  compute24hChange,
  DEFAULT_FAVORITES,
  formatChange,
  formatPrice,
  WS_STATUS,
  type CoinData,
  type WsStatus,
} from './types';

function StatusDot({ status }: { status: WsStatus }) {
  const color =
    status === WS_STATUS.CONNECTED
      ? 'bg-green-500'
      : status === WS_STATUS.RECONNECTING || status === WS_STATUS.CONNECTING
        ? 'bg-yellow-500 animate-pulse'
        : 'bg-red-500';

  const label =
    status === WS_STATUS.CONNECTED
      ? 'Live'
      : status === WS_STATUS.RECONNECTING
        ? 'Reconnecting...'
        : status === WS_STATUS.CONNECTING
          ? 'Connecting...'
          : 'Disconnected';

  return (
    <div className="flex items-center gap-1.5" title={label}>
      <div className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

export function CryptoPricesCompact({ ctx }: WidgetViewProps) {
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load favorites from DB
  useEffect(() => {
    (async () => {
      const stored = (await ctx.db.get('crypto-favorites')) as string[] | undefined;
      setFavorites(stored ?? DEFAULT_FAVORITES);
    })();
  }, [ctx]);

  // Fetch initial data via Rust
  useEffect(() => {
    (async () => {
      try {
        const data = (await ctx.invoke('fetch_crypto_meta_and_prices')) as CoinData[];
        setCoins(data);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [ctx]);

  // WS price updates
  const handlePriceUpdate = useCallback(
    (mids: Record<string, string>) => {
      setCoins((prev) =>
        prev.map((coin) => {
          const newPx = mids[coin.name];
          if (newPx && newPx !== coin.markPx) {
            return { ...coin, markPx: newPx };
          }
          return coin;
        }),
      );
    },
    [],
  );

  const { status } = useHyperliquidWs({
    enabled: true,
    onPriceUpdate: handlePriceUpdate,
  });

  // Filter to favorites
  const favCoins = useMemo(() => {
    return favorites
      .map((name) => coins.find((c) => c.name === name))
      .filter((c): c is CoinData => c !== undefined);
  }, [favorites, coins]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-3">
        <WifiOff className="h-5 w-5 text-destructive" />
        <p className="text-xs text-muted-foreground text-center">Failed to load prices</p>
      </div>
    );
  }

  if (favCoins.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-3">
        <TrendingUp className="h-5 w-5 text-muted-foreground" />
        <p className="text-xs text-muted-foreground text-center">
          No favorites yet. Expand to add coins.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-2">
      <div className="mb-1.5 flex items-center justify-between">
        <StatusDot status={status} />
        <span className="text-[10px] text-muted-foreground">{favCoins.length} coins</span>
      </div>

      <ScrollArea className="flex-1 -mx-2">
        <div className="space-y-0.5 px-2">
          {favCoins.map((coin) => {
            const change = compute24hChange(coin.markPx, coin.prevDayPx);
            const isPositive = change >= 0;

            return (
              <div
                key={coin.name}
                className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50"
              >
                <span className="text-sm font-medium">{coin.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono">${formatPrice(coin.markPx)}</span>
                  <span
                    className={`flex items-center gap-0.5 text-xs font-medium ${
                      isPositive ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {formatChange(change)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
