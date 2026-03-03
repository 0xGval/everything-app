import { useEffect, useRef, useState } from 'react';

interface LazyWidgetProps {
  children: React.ReactNode;
}

/**
 * Renders children only when the container is (or has been) visible in the viewport.
 * Once mounted, stays mounted to preserve widget state.
 */
export function LazyWidget({ children }: LazyWidgetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasBeenVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="h-full w-full">
      {hasBeenVisible ? (
        children
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
          Loading...
        </div>
      )}
    </div>
  );
}
