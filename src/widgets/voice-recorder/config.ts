import { registerWidget } from '@/lib/widget-sdk/registry';
import manifest from './manifest.json';
import { VoiceRecorderCompact } from './VoiceRecorderCompact';
import { VoiceRecorderExpanded } from './VoiceRecorderExpanded';
import type { WidgetManifest } from '@/lib/widget-sdk/types';

registerWidget({
  manifest: manifest as WidgetManifest,
  CompactView: VoiceRecorderCompact,
  ExpandedView: VoiceRecorderExpanded,
});
