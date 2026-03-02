import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  Search,
  Copy,
  Trash2,
  RotateCcw,
  Loader2,
  AlertCircle,
  Pencil,
  Check,
  X,
  Mic,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { WidgetViewProps } from '@/lib/widget-sdk/types';
import { useLayoutStore } from '@/lib/store/layout-store';
import { formatDuration, formatDate, formatTime } from './types';
import type { VoiceRecording, TranscriptionResult } from './types';

export function VoiceRecorderExpanded({ ctx }: WidgetViewProps) {
  const [recordings, setRecordings] = useState<VoiceRecording[]>([]);
  const [search, setSearch] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const collapseWidget = useLayoutStore((s) => s.collapseWidget);

  // Load recordings on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = (await ctx.db.get('voice-recordings')) as VoiceRecording[] | undefined;
      if (!cancelled && stored) setRecordings(stored);
    })();
    return () => {
      cancelled = true;
    };
  }, [ctx]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
  }, []);

  const togglePlay = useCallback(
    async (recording: VoiceRecording) => {
      // Stop current playback
      stopPlayback();

      if (playingId === recording.id) return;

      try {
        const base64 = (await ctx.invoke('read_audio_base64', {
          path: recording.path,
        })) as string;

        const audio = new Audio(`data:audio/wav;base64,${base64}`);
        audioRef.current = audio;
        audio.onended = () => setPlayingId(null);
        await audio.play();
        setPlayingId(recording.id);
      } catch (err) {
        console.error('Failed to play audio:', err);
        setPlayingId(null);
      }
    },
    [playingId, stopPlayback],
  );

  const saveTranscription = useCallback(
    async (id: string, text: string) => {
      const updated = recordings.map((r) => (r.id === id ? { ...r, transcription: text } : r));
      setRecordings(updated);
      await ctx.db.set('voice-recordings', updated);
      setEditingId(null);
    },
    [ctx, recordings],
  );

  const deleteRecording = useCallback(
    async (id: string) => {
      const recording = recordings.find((r) => r.id === id);
      if (!recording) return;

      if (playingId === id) stopPlayback();

      try {
        await ctx.invoke('delete_recording_file', { path: recording.path });
      } catch {
        // File might already be deleted
      }

      const updated = recordings.filter((r) => r.id !== id);
      setRecordings(updated);
      await ctx.db.set('voice-recordings', updated);
      setDeletingId(null);
    },
    [ctx, recordings, playingId, stopPlayback],
  );

  const retryTranscription = useCallback(
    async (id: string) => {
      setRetryingId(id);
      try {
        const recording = recordings.find((r) => r.id === id);
        if (!recording) return;

        const language = (ctx.settings.get('language') as string) ?? 'en';
        const result = (await ctx.invoke('transcribe_audio', {
          path: recording.path,
          language,
        })) as TranscriptionResult;

        const updated = recordings.map((r) =>
          r.id === id ? { ...r, transcription: result.text } : r,
        );
        setRecordings(updated);
        await ctx.db.set('voice-recordings', updated);
      } catch (err) {
        console.error('Retry transcription failed:', err);
      }
      setRetryingId(null);
    },
    [ctx, recordings],
  );

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  }, []);

  // Filter and reverse (newest first)
  const filtered = recordings
    .filter((r) => {
      if (!search) return true;
      return r.transcription.toLowerCase().includes(search.toLowerCase());
    })
    .slice()
    .reverse();

  return (
    <div className="flex flex-col h-full p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={collapseWidget}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Voice Recorder</h1>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recordings..."
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {filtered.length} recording{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Recordings list */}
      <ScrollArea className="flex-1 min-h-0 pr-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Mic className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">
              {search ? 'No recordings match your search' : 'No recordings yet'}
            </p>
            {!search && (
              <p className="text-xs mt-1">Record from the compact view to get started</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((recording) => {
              const isPlaying = playingId === recording.id;
              const isEditing = editingId === recording.id;
              const isRetrying = retryingId === recording.id;
              const isDeleting = deletingId === recording.id;
              const hasTranscription = recording.transcription.length > 0;

              return (
                <div key={recording.id} className="p-3 rounded-lg border bg-card">
                  {/* Top row: play, date/time, duration, actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => togglePlay(recording)}
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>

                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm font-medium">
                        {formatDate(recording.timestamp)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(recording.timestamp)}
                      </span>
                      <Badge variant="outline" className="text-xs font-mono">
                        {formatDuration(recording.duration)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {hasTranscription && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => copyToClipboard(recording.transcription)}
                          title="Copy transcription"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {isDeleting ? (
                        <>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => deleteRecording(recording.id)}
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setDeletingId(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeletingId(recording.id)}
                          title="Delete recording"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Bottom row: transcription */}
                  <div className="mt-2 ml-10">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="text-sm min-h-[60px]"
                        />
                        <div className="flex flex-col gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => saveTranscription(recording.id, editText)}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ) : hasTranscription ? (
                      <div className="flex items-start gap-1 group">
                        <p className="text-sm text-muted-foreground flex-1">
                          {recording.transcription}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            setEditingId(recording.id);
                            setEditText(recording.transcription);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                        <span className="text-xs text-muted-foreground">No transcription</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs ml-auto"
                          onClick={() => retryTranscription(recording.id)}
                          disabled={isRetrying}
                        >
                          {isRetrying ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <RotateCcw className="h-3 w-3 mr-1" />
                          )}
                          {isRetrying ? 'Retrying...' : 'Retry'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
