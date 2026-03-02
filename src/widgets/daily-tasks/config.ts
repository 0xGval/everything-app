import { registerWidget } from '@/lib/widget-sdk/registry';
import manifest from './manifest.json';
import { DailyTasksCompact } from './DailyTasksCompact';
import { DailyTasksExpanded } from './DailyTasksExpanded';
import type { WidgetManifest } from '@/lib/widget-sdk/types';

registerWidget({
  manifest: manifest as WidgetManifest,
  CompactView: DailyTasksCompact,
  ExpandedView: DailyTasksExpanded,
});
