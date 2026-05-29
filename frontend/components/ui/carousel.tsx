import * as React from 'react';
import { cn } from '@/lib/utils';

interface CarouselProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  controlsPosition?: 'top' | 'bottom';
}

export function Carousel<T>({ items, renderItem, className, controlsPosition = 'bottom' }: CarouselProps<T>) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const activeItem = items[activeIndex];

  const prev = () => setActiveIndex((current) => (current - 1 + items.length) % items.length);
  const next = () => setActiveIndex((current) => (current + 1) % items.length);

  if (items.length === 0) {
    return null;
  }

  const controls = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        onClick={prev}
        className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
      >
        Previous
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900/80 px-2 py-2 text-xs text-slate-300 shadow-inner scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-950">
        {items.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={cn(
              'shrink-0 rounded-full px-3 py-2 font-semibold transition whitespace-nowrap',
              activeIndex === index
                ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            )}
          >
            {index + 1}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={next}
        className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
      >
        Next
      </button>
    </div>
  );

  return (
    <div className={cn('space-y-4 w-full overflow-hidden', className)}>
      {controlsPosition === 'top' ? controls : null}
      <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 shadow-sm overflow-hidden w-full">
        {renderItem(activeItem, activeIndex)}
      </div>
      {controlsPosition === 'bottom' ? controls : null}
    </div>
  );
}
