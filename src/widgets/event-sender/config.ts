import { registerWidget } from '@/lib/widget-sdk/registry';
import manifest from './manifest.json';
import { EventSenderCompact } from './EventSenderCompact';
import type { WidgetManifest } from '@/lib/widget-sdk/types';

registerWidget({
  manifest: manifest as WidgetManifest,
  CompactView: EventSenderCompact,
});
