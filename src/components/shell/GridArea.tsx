import { useCallback, useEffect, useMemo } from 'react';
import { ArrowLeft, icons, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';
import { WidgetGrid } from './WidgetGrid';
import { useLayoutStore } from '@/lib/store/layout-store';
import { getWidget } from '@/lib/widget-sdk/registry';
import { createWidgetContext } from '@/lib/widget-sdk/context';

const iconsRecord = icons as Record<string, LucideIcon>;

export function GridArea() {
  const expandedWidget = useLayoutStore((s) => s.expandedWidget);
  const collapseWidget = useLayoutStore((s) => s.collapseWidget);

  const definition = expandedWidget ? getWidget(expandedWidget.widgetType) : undefined;
  const ctx = useMemo(
    () => (expandedWidget ? createWidgetContext(expandedWidget.instanceId) : null),
    [expandedWidget],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expandedWidget) {
        collapseWidget();
      }
    },
    [expandedWidget, collapseWidget],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const IconComponent = definition?.manifest.icon
    ? iconsRecord[definition.manifest.icon] ?? null
    : null;

  return (
    <div className="flex flex-1 overflow-hidden bg-background">
      <AnimatePresence mode="wait">
        {expandedWidget && definition?.ExpandedView && ctx ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={collapseWidget}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              {IconComponent && (
                <IconComponent className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">{definition.manifest.name}</span>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <WidgetErrorBoundary
                widgetName={definition.manifest.name}
                onRemove={collapseWidget}
              >
                <definition.ExpandedView ctx={ctx} />
              </WidgetErrorBoundary>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="flex flex-1 overflow-hidden"
          >
            <WidgetGrid />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
