'use client';

import React from 'react';
import { Carousel } from '@/components/ui/carousel';

type ReviewResultCardProps = {
  title: string;
  section: any;
  index: number;
};

const sensitiveKeys = [
  'password', 'pass', 'pwd', 'secret', 'token', 'key',
  'hash', 'salt', 'bcrypt', 'md5', 'sha', 'auth'
];

const isSensitiveField = (key: string) =>
  sensitiveKeys.some((keyword) => key.toLowerCase().includes(keyword));

const isPlainObject = (value: unknown): value is Record<string, any> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const formatFieldKey = (key: string) =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/_/g, ' ');

const isImageUrl = (value: unknown): value is string =>
  typeof value === 'string' && /^https?:\/\/.+\.(png|jpe?g|webp|avif|svg)(\?.*)?$/i.test(value);

const isFlagField = (key?: string) =>
  typeof key === 'string' && key.toLowerCase().includes('flag');

const renderValue = (value: any, key?: string): React.ReactNode => {
  if (value === null || value === undefined) {
    return <span className="text-slate-400">N/A</span>;
  }

  if (typeof value === 'string' && isFlagField(key) && isImageUrl(value)) {
    return (
      <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
        <img src={value} alt={formatFieldKey(key ?? '')} className="h-10 w-14 rounded-lg object-cover border border-slate-800" />
        <span className="text-sm text-slate-200">{formatFieldKey(key ?? '')}</span>
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div className="grid gap-2">
        {value.map((item, index) => (
          <div key={index} className="rounded-2xl border border-slate-800 bg-slate-950/90 px-3 py-2 text-sm text-slate-100">
            {renderValue(item, key)}
          </div>
        ))}
      </div>
    );
  }

  if (isPlainObject(value)) {
    return (
      <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/90 p-3">
        {Object.entries(value).map(([subKey, subValue]) => (
          <div key={subKey} className="grid gap-1 rounded-2xl bg-slate-900/95 p-3">
            <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{formatFieldKey(subKey)}</span>
            <div className={`text-sm break-words ${isSensitiveField(subKey) || isSensitiveField(key ?? '') ? 'font-semibold text-rose-200' : 'text-slate-100'}`}>
              {renderValue(subValue, subKey)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <span>{String(value)}</span>;
};

const renderIpSearchFieldValue = (value: any, key?: string): React.ReactNode => {
  if (value === null || value === undefined) {
    return <span className="text-slate-400">N/A</span>;
  }

  if (typeof value === 'string' && isFlagField(key) && isImageUrl(value)) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 p-2">
        <img src={value} alt={formatFieldKey(key ?? '')} className="h-8 w-12 rounded-lg object-cover border border-slate-800" />
        <div className="text-sm text-slate-200">
          <p className="font-medium">Country flag</p>
          <p className="text-[11px] text-slate-500 break-all">{value}</p>
        </div>
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div className="grid gap-2">
        {value.map((item, index) => (
          <div key={index} className="rounded-2xl border border-slate-800 bg-slate-950/90 p-2 text-sm text-slate-100">
            {renderValue(item, key)}
          </div>
        ))}
      </div>
    );
  }

  if (isPlainObject(value)) {
    return (
      <div className="grid gap-2">
        {Object.entries(value).map(([subKey, subValue]) => (
          <div key={subKey} className="rounded-2xl border border-slate-800 bg-slate-950/90 p-2">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{formatFieldKey(subKey)}</span>
              {isSensitiveField(subKey) ? (
                <span className="text-[10px] uppercase tracking-[0.18em] text-rose-300">Sensitive</span>
              ) : null}
            </div>
            <div className={`text-sm leading-5 break-words ${isSensitiveField(subKey) || isSensitiveField(key ?? '') ? 'font-semibold text-rose-200' : 'text-slate-100'}`}>
              {renderValue(subValue, subKey)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <span className="text-slate-100">{String(value)}</span>;
};

const renderIpSearchFieldCard = ([key, value]: [string, any]) => (
  <div key={key} className="w-full rounded-3xl border border-slate-800 bg-slate-900/95 p-3 shadow-sm shadow-slate-950/10">
    <div className="mb-2 text-slate-100">
      <h3 className="text-sm font-semibold text-slate-100">{formatFieldKey(key)}</h3>
    </div>
    <div className={`text-sm ${isSensitiveField(key) ? 'font-semibold text-rose-200' : 'text-slate-100'}`}>
      {renderIpSearchFieldValue(value, key)}
    </div>
  </div>
);

export function ReviewResultCard({ title, section, index }: ReviewResultCardProps) {
  const items = Array.isArray(section?.Data)
    ? section.Data
    : Array.isArray(section)
    ? section
    : section && typeof section === 'object'
    ? [section]
    : [];
  const infoLeak = section?.InfoLeak ?? section?.infoLeak;
  const numOfResults = section?.NumOfResults ?? section?.numOfResults ?? items.length;
  const isIpSearch = title.toLowerCase().includes('ip search');

  const renderResultItem = (item: Record<string, any>, itemIndex: number) => (
    <div key={`${title}-${itemIndex}`} className="w-full rounded-3xl border border-slate-800 bg-slate-900/95 p-4 overflow-hidden">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Result {itemIndex + 1}</span>
          <p className="text-xs text-slate-400">{Object.keys(item).length} field{Object.keys(item).length === 1 ? '' : 's'}</p>
        </div>
      </div>
      {isIpSearch ? (
        <Carousel
          items={Object.entries(item)}
          className="space-y-4"
          controlsPosition="top"
          renderItem={renderIpSearchFieldCard}
        />
      ) : (
        <div className="grid gap-3 text-slate-200">
          {Object.entries(item).map(([key, value]) => (
            <div key={key} className="grid gap-2 rounded-2xl bg-slate-950/80 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{formatFieldKey(key)}</span>
                {isSensitiveField(key) ? <span className="text-[11px] uppercase tracking-[0.22em] text-rose-300">Sensitive</span> : null}
              </div>
              <div className={`text-sm leading-6 break-words ${isSensitiveField(key) ? 'font-semibold text-rose-200' : 'text-slate-100'}`}>
                {renderValue(value, key)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 p-6 shadow-xl shadow-slate-950/30 transition-all duration-200 overflow-hidden">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold uppercase tracking-[0.18em] text-slate-100 truncate">{title}</h2>
          <p className="mt-1 text-xs text-slate-400">{numOfResults} result{numOfResults === 1 ? '' : 's'}</p>
        </div>
        {infoLeak ? (
          <div className="rounded-full bg-slate-900 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
            Info leak
          </div>
        ) : null}
      </div>

      {infoLeak ? <p className="mb-4 text-sm leading-6 text-slate-300">{infoLeak}</p> : null}

      {items.length > 0 ? (
        <div className="grid gap-4">
          {items.length > 1 ? (
            <Carousel
              items={items}
              className="space-y-4"
              renderItem={renderResultItem}
            />
          ) : (
            renderResultItem(items[0], 0)
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-400">No data available for this section.</div>
      )}
    </div>
  );
}
