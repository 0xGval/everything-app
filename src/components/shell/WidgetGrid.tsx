import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  Responsive as ResponsiveGridLayout,
  verticalCompactor,
  type LayoutItem,
  type Layout,
  type ResponsiveLayouts,
} from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { WidgetCard } from './WidgetCard';

interface PlaceholderWidget {
  id: string;
  title: string;
  color: string;
}

const PLACEHOLDER_WIDGETS: PlaceholderWidget[] = [
  { id: 'a', title: 'Widget A', color: 'bg-blue-500/20 text-blue-400' },
  { id: 'b', title: 'Widget B', color: 'bg-emerald-500/20 text-emerald-400' },
  { id: 'c', title: 'Widget C', color: 'bg-amber-500/20 text-amber-400' },
];

const DEFAULT_LAYOUT: LayoutItem[] = [
  { i: 'a', x: 0, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
  { i: 'b', x: 4, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
  { i: 'c', x: 8, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
];

const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };

const DRAG_CONFIG = { handle: '.drag-handle' };
const RESIZE_CONFIG = { handles: ['se'] as const };

export function WidgetGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [rowHeight, setRowHeight] = useState(100);

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

  const layouts = useMemo<ResponsiveLayouts>(() => ({ lg: DEFAULT_LAYOUT }), []);

  const onLayoutChange = useCallback((_layout: Layout, _layouts: ResponsiveLayouts) => {
    console.log('layout changed:', _layout);
  }, []);

  return (
    <div ref={containerRef} className="flex-1 overflow-auto p-2">
      {containerWidth > 0 && (
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
          {PLACEHOLDER_WIDGETS.map((widget) => (
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
