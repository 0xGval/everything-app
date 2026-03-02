import { useState } from 'react';

import { invoke } from '@tauri-apps/api/core';

import { Button } from '@/components/ui/button';

interface AudioDevice {
  name: string;
  is_default: boolean;
}

interface RecordingResult {
  path: string;
  duration_seconds: number;
}

export function AudioTest() {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [recording, setRecording] = useState(false);
  const [recordingPath, setRecordingPath] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<RecordingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const listDevices = async () => {
    setError(null);
    try {
      const result = await invoke<AudioDevice[]>('list_audio_devices');
      setDevices(result);
      console.log('Audio devices:', result);
    } catch (e) {
      const msg = String(e);
      setError(msg);
      console.error('list_audio_devices error:', e);
    }
  };

  const startRecording = async () => {
    setError(null);
    setLastResult(null);
    try {
      const path = await invoke<string>('start_recording');
      setRecording(true);
      setRecordingPath(path);
      console.log('Recording started:', path);
    } catch (e) {
      const msg = String(e);
      setError(msg);
      console.error('start_recording error:', e);
    }
  };

  const stopRecording = async () => {
    setError(null);
    try {
      const result = await invoke<RecordingResult>('stop_recording');
      setRecording(false);
      setRecordingPath(null);
      setLastResult(result);
      console.log('Recording stopped:', result);
    } catch (e) {
      const msg = String(e);
      setError(msg);
      console.error('stop_recording error:', e);
    }
  };

  return (
    <div className="border-border bg-card m-4 space-y-3 rounded-lg border p-4">
      <h3 className="text-sm font-semibold">Audio Test (Phase 3.1 — temporary)</h3>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={listDevices}>
          List Devices
        </Button>
        <Button size="sm" variant="outline" onClick={startRecording} disabled={recording}>
          Start Recording
        </Button>
        <Button
          size="sm"
          variant={recording ? 'destructive' : 'outline'}
          onClick={stopRecording}
          disabled={!recording}
        >
          Stop Recording
        </Button>
      </div>

      {recording && recordingPath && (
        <p className="text-muted-foreground text-xs">
          Recording to: <code className="text-xs">{recordingPath}</code>
        </p>
      )}

      {error && <p className="text-destructive text-xs">Error: {error}</p>}

      {lastResult && (
        <div className="text-muted-foreground space-y-1 text-xs">
          <p>Saved: {lastResult.path}</p>
          <p>Duration: {lastResult.duration_seconds.toFixed(2)}s</p>
        </div>
      )}

      {devices.length > 0 && (
        <div className="text-muted-foreground space-y-1 text-xs">
          <p className="font-medium">Input devices:</p>
          {devices.map((d, i) => (
            <p key={i}>
              {d.is_default ? '* ' : '  '}
              {d.name}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
