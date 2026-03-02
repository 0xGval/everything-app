import { useState } from 'react';

import { invoke } from '@tauri-apps/api/core';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AudioDevice {
  name: string;
  is_default: boolean;
}

interface RecordingResult {
  path: string;
  duration_seconds: number;
}

interface TranscriptionResult {
  text: string;
}

export function AudioTest() {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [recording, setRecording] = useState(false);
  const [recordingPath, setRecordingPath] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<RecordingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Transcription state
  const [apiKey, setApiKey] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [language, setLanguage] = useState('en');

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
    setTranscription(null);
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

  const saveApiKey = async () => {
    setError(null);
    try {
      await invoke('save_groq_api_key', { apiKey });
      setApiKey('');
      console.log('API key saved');
    } catch (e) {
      const msg = String(e);
      setError(msg);
      console.error('save_groq_api_key error:', e);
    }
  };

  const transcribe = async () => {
    if (!lastResult) return;
    setError(null);
    setTranscription(null);
    setTranscribing(true);
    try {
      const result = await invoke<TranscriptionResult>('transcribe_audio', {
        path: lastResult.path,
        language,
      });
      setTranscription(result.text);
      console.log('Transcription:', result.text);
    } catch (e) {
      const msg = String(e);
      setError(msg);
      console.error('transcribe_audio error:', e);
    } finally {
      setTranscribing(false);
    }
  };

  return (
    <div className="border-border bg-card m-4 space-y-3 rounded-lg border p-4">
      <h3 className="text-sm font-semibold">Audio + Transcription Test (Phase 3.2 — temporary)</h3>

      {/* Groq API Key */}
      <div className="flex items-center gap-2">
        <Input
          type="password"
          placeholder="Groq API key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="h-8 max-w-xs text-xs"
        />
        <Button size="sm" variant="outline" onClick={saveApiKey} disabled={!apiKey}>
          Save Key
        </Button>
      </div>

      {/* Audio controls */}
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

      {/* Transcription controls */}
      <div className="flex items-center gap-2">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="border-border bg-background h-8 rounded-md border px-2 text-xs"
        >
          <option value="en">English</option>
          <option value="it">Italian</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
        </select>
        <Button
          size="sm"
          variant="outline"
          onClick={transcribe}
          disabled={!lastResult || transcribing}
        >
          {transcribing ? 'Transcribing...' : 'Transcribe'}
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

      {transcription !== null && (
        <div className="border-border space-y-1 rounded-md border p-2">
          <p className="text-xs font-medium">Transcription:</p>
          <p className="text-sm">{transcription}</p>
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
