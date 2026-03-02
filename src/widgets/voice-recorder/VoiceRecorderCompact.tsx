import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader2, AlertCircle, Settings } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { WidgetViewProps } from '@/lib/widget-sdk/types';
import { onSettingsChange, getSettingSync } from '@/lib/widget-sdk/settings-cache';
import { formatDuration } from './types';
import type { VoiceRecording, RecordingResult, TranscriptionResult } from './types';

type RecordingState = 'idle' | 'recording' | 'transcribing';

export function VoiceRecorderCompact({ ctx }: WidgetViewProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [recordings, setRecordings] = useState<VoiceRecording[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync Groq API key between widget settings and Rust backend
  const syncApiKey = useCallback(() => {
    const key = (getSettingSync(ctx.widgetId, 'groqApiKey') as string) ?? '';
    setHasApiKey(key.length > 0);
    if (key) {
      ctx.invoke('save_groq_api_key', { apiKey: key }).catch(() => {});
    }
  }, [ctx]);

  useEffect(() => {
    (async () => {
      const settingsKey = (getSettingSync(ctx.widgetId, 'groqApiKey') as string) ?? '';
      if (settingsKey) {
        // Widget settings has the key — sync to Rust backend
        setHasApiKey(true);
        ctx.invoke('save_groq_api_key', { apiKey: settingsKey }).catch(() => {});
      } else {
        // Check if Rust backend has a key (saved in a previous session)
        const backendKey = (await ctx.invoke('get_groq_api_key')) as string | null;
        if (backendKey) {
          // Sync backend key INTO widget settings so settings dialog shows it
          setHasApiKey(true);
          await ctx.settings.set('groqApiKey', backendKey);
        } else {
          setHasApiKey(false);
        }
      }
    })();

    return onSettingsChange(ctx.widgetId, syncApiKey);
  }, [ctx, ctx.widgetId, syncApiKey]);

  // Load recordings on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = (await ctx.db.get('voice-recordings')) as VoiceRecording[] | undefined;
      if (!cancelled && stored) {
        setRecordings(stored);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ctx]);

  // Timer management
  const startTimer = useCallback(() => {
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleRecord = useCallback(async () => {
    setError(null);
    try {
      await ctx.invoke('start_recording');
      setState('recording');
      startTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [ctx, startTimer]);

  const handleStop = useCallback(async () => {
    stopTimer();
    try {
      const result = (await ctx.invoke('stop_recording')) as RecordingResult;
      setState('transcribing');

      const language = (ctx.settings.get('language') as string) ?? 'en';

      try {
        const transcription = (await ctx.invoke('transcribe_audio', {
          path: result.path,
          language,
        })) as TranscriptionResult;

        const entry: VoiceRecording = {
          id: `voice-${Date.now()}`,
          timestamp: Date.now(),
          duration: Math.round(result.duration_seconds),
          path: result.path,
          transcription: transcription.text,
        };

        const updated = [...recordings, entry];
        setRecordings(updated);
        await ctx.db.set('voice-recordings', updated);

        ctx.emit('voice:transcription_ready', {
          text: transcription.text,
          timestamp: entry.timestamp,
        });
        ctx.sharedState.write('voice:latest', { text: transcription.text });

        // Copy transcription to clipboard
        navigator.clipboard.writeText(transcription.text).catch(() => {});
      } catch (err) {
        // Transcription failed but recording is saved — can retry in expanded view
        const entry: VoiceRecording = {
          id: `voice-${Date.now()}`,
          timestamp: Date.now(),
          duration: Math.round(result.duration_seconds),
          path: result.path,
          transcription: '',
        };

        const updated = [...recordings, entry];
        setRecordings(updated);
        await ctx.db.set('voice-recordings', updated);

        setError(err instanceof Error ? err.message : String(err));
      }

      setState('idle');
    } catch (err) {
      setState('idle');
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [ctx, recordings, stopTimer]);

  const lastTranscription = [...recordings].reverse().find((r) => r.transcription)?.transcription;

  const statusText =
    state === 'recording'
      ? 'Recording...'
      : state === 'transcribing'
        ? 'Transcribing...'
        : error
          ? 'Error'
          : 'Ready';

  const statusColor =
    state === 'recording'
      ? 'text-red-500'
      : state === 'transcribing'
        ? 'text-yellow-500'
        : error
          ? 'text-red-500'
          : 'text-muted-foreground';

  return (
    <div className="flex flex-col h-full p-2 gap-2">
      {/* Status bar */}
      <div className={cn('text-xs font-medium text-center', statusColor)}>{statusText}</div>

      {/* Record button + timer */}
      <div className="flex flex-col items-center justify-center flex-1 gap-2">
        <AnimatePresence mode="wait">
          {state === 'recording' ? (
            <motion.div
              key="recording"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative"
            >
              {/* Pulsing ring */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-red-500 pointer-events-none"
                animate={{ scale: [1, 1.3, 1], opacity: [0.7, 0, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <Button
                variant="destructive"
                size="icon"
                className="h-14 w-14 rounded-full"
                onClick={handleStop}
              >
                <Square className="h-5 w-5" />
              </Button>
            </motion.div>
          ) : state === 'transcribing' ? (
            <motion.div
              key="transcribing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-muted">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <Button
                variant="outline"
                size="icon"
                className="h-14 w-14 rounded-full"
                onClick={handleRecord}
              >
                <Mic className="h-6 w-6" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timer */}
        {state === 'recording' && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm font-mono tabular-nums text-muted-foreground"
          >
            {formatDuration(elapsed)}
          </motion.span>
        )}
      </div>

      {/* No API key warning */}
      {!hasApiKey && state === 'idle' && !error && (
        <div className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1.5">
          <Settings className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Set Groq API key in widget settings
          </span>
        </div>
      )}

      {/* Error message */}
      {error && state === 'idle' && (
        <div className="flex items-start gap-1.5 rounded-md bg-destructive/10 px-2 py-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive mt-0.5" />
          <span className="text-xs text-destructive line-clamp-2">{error}</span>
        </div>
      )}

      {/* Last transcription preview */}
      {lastTranscription && !error && state === 'idle' && (
        <div className="rounded-md bg-muted/50 px-2 py-1.5">
          <p className="text-xs text-muted-foreground line-clamp-2">{lastTranscription}</p>
        </div>
      )}
    </div>
  );
}
