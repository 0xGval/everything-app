import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  Search,
  Star,
  TrendingDown,
  TrendingUp,
  WifiOff,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { WidgetViewProps } from '@/lib/widget-sdk/types';

import { useHyperliquidWs } from './use-hyperliquid-ws';
import {
  compute24hChange,
  DEFAULT_FAVORITES,
  formatChange,
  formatPrice,
  formatVolume,
  WS_STATUS,
  type CoinData,
} from './types';

export function CryptoPricesExpanded({ ctx }: WidgetViewProps) {
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Load favorites
  useEffect(() => {
    (async () => {
      const stored = (await ctx.db.get('crypto-favorites')) as string[] | undefined;
      setFavorites(stored ?? DEFAULT_FAVORITES);
    })();
  }, [ctx]);

  // Fetch initial data
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
  const handlePriceUpdate = useCallback((mids: Record<string, string>) => {
    setCoins((prev) =>
      prev.map((coin) => {
        const newPx = mids[coin.name];
        if (newPx && newPx !== coin.markPx) {
          return { ...coin, markPx: newPx };
        }
        return coin;
      }),
    );
  }, []);

  const { status } = useHyperliquidWs({
    enabled: true,
    onPriceUpdate: handlePriceUpdate,
  });

  const toggleFavorite = useCallback(
    async (name: string) => {
      setFavorites((prev) => {
        const next = prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name];
        ctx.db.set('crypto-favorites', next);
        return next;
      });
    },
    [ctx],
  );

  const favSet = useMemo(() => new Set(favorites), [favorites]);

  const favCoins = useMemo(() => {
    return favorites
      .map((name) => coins.find((c) => c.name === name))
      .filter((c): c is CoinData => c !== undefined);
  }, [favorites, coins]);

  const filteredCoins = useMemo(() => {
    if (!search.trim()) return coins;
    const q = search.trim().toUpperCase();
    return coins.filter((c) => c.name.toUpperCase().includes(q));
  }, [coins, search]);

  const statusColor =
    status === WS_STATUS.CONNECTED
      ? 'bg-green-500'
      : status === WS_STATUS.RECONNECTING || status === WS_STATUS.CONNECTING
        ? 'bg-yellow-500 animate-pulse'
        : 'bg-red-500';

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <WifiOff className="h-6 w-6 text-destructive" />
        <p className="text-sm text-muted-foreground">Failed to load prices</p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Crypto Prices</h2>
          <Badge variant="outline" className="text-[10px] gap-1">
            <div className={`h-1.5 w-1.5 rounded-full ${statusColor}`} />
            {status === WS_STATUS.CONNECTED ? 'Live' : 'Offline'}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">{coins.length} coins</span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search coins..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="favorites" className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="favorites">
            Favorites ({favorites.length})
          </TabsTrigger>
          <TabsTrigger value="all">All Coins</TabsTrigger>
        </TabsList>

        <TabsContent value="favorites" className="flex-1 min-h-0">
          {favCoins.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No favorites yet. Switch to "All Coins" to add some.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-1">
                {favCoins.map((coin) => (
                  <CoinRow
                    key={coin.name}
                    coin={coin}
                    isFavorite={true}
                    onToggleFavorite={toggleFavorite}
                    showVolume
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="all" className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="space-y-1">
              {filteredCoins.map((coin) => (
                <CoinRow
                  key={coin.name}
                  coin={coin}
                  isFavorite={favSet.has(coin.name)}
                  onToggleFavorite={toggleFavorite}
                  showVolume
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface CoinRowProps {
  coin: CoinData;
  isFavorite: boolean;
  onToggleFavorite: (name: string) => void;
  showVolume?: boolean;
}

function CoinRow({ coin, isFavorite, onToggleFavorite, showVolume }: CoinRowProps) {
  const change = compute24hChange(coin.markPx, coin.prevDayPx);
  const isPositive = change >= 0;

  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/50">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={() => onToggleFavorite(coin.name)}
      >
        {isFavorite ? (
          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
        ) : (
          <Star className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>

      <span className="min-w-[4rem] text-sm font-medium">{coin.name}</span>

      <span className="ml-auto font-mono text-sm">${formatPrice(coin.markPx)}</span>

      <span
        className={`flex items-center gap-0.5 min-w-[5rem] justify-end text-xs font-medium ${
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

      {showVolume && (
        <span className="min-w-[4.5rem] text-right text-xs text-muted-foreground">
          ${formatVolume(coin.dayNtlVlm)}
        </span>
      )}
    </div>
  );
}
