'use client';

import React from 'react';

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

const formatFieldKey = (key: string) =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/_/g, ' ');

export function ReviewResultCard({ title, section, index }: ReviewResultCardProps) {
  const items = Array.isArray(section?.Data) ? section.Data : [];
  const infoLeak = section?.InfoLeak ?? section?.infoLeak;
  const numOfResults = section?.NumOfResults ?? section?.numOfResults ?? items.length;

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
          {items.slice(0, 5).map((item: Record<string, any>, itemIndex: number) => (
            <div key={`${title}-${itemIndex}`} className="w-full rounded-3xl border border-slate-800 bg-slate-900/95 p-4 overflow-hidden">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Result {itemIndex + 1}</span>
                <span className="text-xs text-slate-400">{Object.keys(item).length} fields</span>
              </div>
              <div className="grid gap-2 text-slate-200">
                {Object.entries(item).map(([key, value]) => (
                  <div key={key} className="flex flex-col gap-1 rounded-2xl bg-slate-950/80 p-3">
                    <span className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{formatFieldKey(key)}</span>
                    <span className={`text-sm break-words ${isSensitiveField(key) ? 'font-semibold text-rose-200' : 'text-slate-100'}`}>
                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {items.length > 5 ? (
            <div className="text-right text-xs text-slate-400">+{items.length - 5} more row{items.length - 5 === 1 ? '' : 's'}</div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-400">No data available for this section.</div>
      )}
    </div>
  );
}
