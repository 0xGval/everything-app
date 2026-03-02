import { registerWidget } from '@/lib/widget-sdk/registry';
import manifest from './manifest.json';
import { CravingCompact } from './CravingCompact';
import type { WidgetManifest } from '@/lib/widget-sdk/types';

registerWidget({
  manifest: manifest as WidgetManifest,
  CompactView: CravingCompact,
});
