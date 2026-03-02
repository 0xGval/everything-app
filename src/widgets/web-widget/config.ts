import { registerWidget } from '@/lib/widget-sdk/registry';
import manifest from './manifest.json';
import { WebWidgetCompact } from './WebWidgetCompact';
import { WebWidgetExpanded } from './WebWidgetExpanded';
import type { WidgetManifest } from '@/lib/widget-sdk/types';

registerWidget({
  manifest: manifest as WidgetManifest,
  CompactView: WebWidgetCompact,
  ExpandedView: WebWidgetExpanded,
});
