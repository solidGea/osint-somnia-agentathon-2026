import * as React from 'react';
import { cn } from '@/lib/utils';

interface CarouselProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export function Carousel<T>({ items, renderItem, className }: CarouselProps<T>) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const activeItem = items[activeIndex];

  const prev = () => setActiveIndex((current) => (current - 1 + items.length) % items.length);
  const next = () => setActiveIndex((current) => (current + 1) % items.length);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 shadow-sm">
        {renderItem(activeItem, activeIndex)}
      </div>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={prev}
          className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
        >
          Previous
        </button>
        <div className="flex items-center gap-2">
          {items.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={cn(
                'h-2 w-2 rounded-full transition',
                activeIndex === index ? 'bg-cyan-400' : 'bg-slate-700 hover:bg-slate-500'
              )}
            />
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
    </div>
  );
}
