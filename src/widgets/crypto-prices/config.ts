import { registerWidget } from '@/lib/widget-sdk/registry';
import manifest from './manifest.json';
import { CryptoPricesCompact } from './CryptoPricesCompact';
import { CryptoPricesExpanded } from './CryptoPricesExpanded';
import type { WidgetManifest } from '@/lib/widget-sdk/types';

registerWidget({
  manifest: manifest as WidgetManifest,
  CompactView: CryptoPricesCompact,
  ExpandedView: CryptoPricesExpanded,
});
