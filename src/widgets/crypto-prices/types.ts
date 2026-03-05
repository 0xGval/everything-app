export interface CoinData {
  name: string;
  szDecimals: number;
  markPx: string;
  prevDayPx: string;
  dayNtlVlm: string;
  funding: string;
  openInterest: string;
}

export const WS_STATUS = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  DISCONNECTED: 'disconnected',
} as const;

export type WsStatus = (typeof WS_STATUS)[keyof typeof WS_STATUS];

export function compute24hChange(markPx: string, prevDayPx: string): number {
  const mark = parseFloat(markPx);
  const prev = parseFloat(prevDayPx);
  if (prev === 0) return 0;
  return ((mark - prev) / prev) * 100;
}

export function formatPrice(price: string): string {
  const num = parseFloat(price);
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatVolume(volume: string): string {
  const num = parseFloat(volume);
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(0);
}

export function formatChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

export const DEFAULT_FAVORITES = ['BTC', 'ETH', 'SOL'];
