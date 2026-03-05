import { useCallback, useEffect, useRef, useState } from 'react';

import { WS_STATUS, type WsStatus } from './types';

const WS_URL = 'wss://api.hyperliquid.xyz/ws';
const THROTTLE_MS = 500;
const MAX_RECONNECT_DELAY = 30_000;

interface UseHyperliquidWsOptions {
  enabled: boolean;
  onPriceUpdate: (mids: Record<string, string>) => void;
}

interface UseHyperliquidWsReturn {
  status: WsStatus;
  reconnect: () => void;
}

export function useHyperliquidWs({
  enabled,
  onPriceUpdate,
}: UseHyperliquidWsOptions): UseHyperliquidWsReturn {
  const [status, setStatus] = useState<WsStatus>(WS_STATUS.DISCONNECTED);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onPriceUpdateRef = useRef(onPriceUpdate);
  const lastEmitRef = useRef(0);
  const pendingMidsRef = useRef<Record<string, string> | null>(null);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep callback ref fresh without recreating WS
  onPriceUpdateRef.current = onPriceUpdate;

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const clearThrottleTimer = useCallback(() => {
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
      throttleTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus(WS_STATUS.CONNECTING);

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus(WS_STATUS.CONNECTED);
      reconnectAttemptRef.current = 0;

      // Subscribe to allMids
      ws.send(
        JSON.stringify({
          method: 'subscribe',
          subscription: { type: 'allMids' },
        }),
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        if (data.channel === 'allMids' && data.data?.mids) {
          const mids = data.data.mids as Record<string, string>;
          const now = Date.now();
          const elapsed = now - lastEmitRef.current;

          if (elapsed >= THROTTLE_MS) {
            // Enough time passed — emit immediately
            lastEmitRef.current = now;
            onPriceUpdateRef.current(mids);
          } else {
            // Buffer and schedule
            pendingMidsRef.current = mids;
            if (!throttleTimerRef.current) {
              throttleTimerRef.current = setTimeout(() => {
                throttleTimerRef.current = null;
                if (pendingMidsRef.current) {
                  lastEmitRef.current = Date.now();
                  onPriceUpdateRef.current(pendingMidsRef.current);
                  pendingMidsRef.current = null;
                }
              }, THROTTLE_MS - elapsed);
            }
          }
        }
      } catch {
        // Ignore parse errors
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      setStatus(WS_STATUS.RECONNECTING);

      const attempt = reconnectAttemptRef.current;
      const delay = Math.min(1000 * Math.pow(2, attempt), MAX_RECONNECT_DELAY);
      reconnectAttemptRef.current = attempt + 1;

      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, delay);
    };

    ws.onerror = () => {
      // onclose will fire after this, triggering reconnect
    };
  }, [clearReconnectTimer]);

  const reconnect = useCallback(() => {
    clearReconnectTimer();
    reconnectAttemptRef.current = 0;
    connect();
  }, [connect, clearReconnectTimer]);

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      clearReconnectTimer();
      clearThrottleTimer();
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      setStatus(WS_STATUS.DISCONNECTED);
    };
  }, [enabled, connect, clearReconnectTimer, clearThrottleTimer]);

  return { status, reconnect };
}
