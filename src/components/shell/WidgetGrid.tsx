import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  Responsive as ResponsiveGridLayout,
  verticalCompactor,
  type Layout,
  type ResponsiveLayouts,
} from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { WidgetCard } from './WidgetCard';
import { useLayoutStore } from '@/lib/store/layout-store';

const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };

const DRAG_CONFIG = { handle: '.drag-handle' };
const RESIZE_CONFIG = { handles: ['se'] as const };

export function WidgetGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [rowHeight, setRowHeight] = useState(100);

  const layout = useLayoutStore((s) => s.layout);
  const widgets = useLayoutStore((s) => s.widgets);
  const loaded = useLayoutStore((s) => s.loaded);
  const loadLayout = useLayoutStore((s) => s.loadLayout);
  const updateLayout = useLayoutStore((s) => s.updateLayout);

  useEffect(() => {
    loadLayout('default');
  }, [loadLayout]);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerWidth(entry.contentRect.width);
        setRowHeight(Math.max(60, Math.floor(entry.contentRect.height / 8)));
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const layouts = useMemo<ResponsiveLayouts>(() => ({ lg: layout }), [layout]);

  const onLayoutChange = useCallback(
    (currentLayout: Layout, _allLayouts: ResponsiveLayouts) => {
      if (!loaded) return;
      updateLayout([...currentLayout]);
    },
    [loaded, updateLayout],
  );

  return (
    <div ref={containerRef} className="flex-1 overflow-auto p-2">
      {containerWidth > 0 && loaded && (
        <ResponsiveGridLayout
          layouts={layouts}
          breakpoints={BREAKPOINTS}
          cols={COLS}
          rowHeight={rowHeight}
          width={containerWidth}
          dragConfig={DRAG_CONFIG}
          resizeConfig={RESIZE_CONFIG}
          compactor={verticalCompactor}
          onLayoutChange={onLayoutChange}
          margin={[8, 8] as const}
        >
          {widgets.map((widget) => (
            <div key={widget.id}>
              <WidgetCard title={widget.title}>
                <div
                  className={`flex h-full items-center justify-center rounded-md ${widget.color}`}
                >
                  <span className="text-sm font-medium">{widget.title}</span>
                </div>
              </WidgetCard>
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
