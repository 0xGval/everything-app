import { registerWidget } from '@/lib/widget-sdk/registry';
import manifest from './manifest.json';
import { CounterReaderCompact } from './CounterReaderCompact';
import type { WidgetManifest } from '@/lib/widget-sdk/types';

registerWidget({
  manifest: manifest as WidgetManifest,
  CompactView: CounterReaderCompact,
});
