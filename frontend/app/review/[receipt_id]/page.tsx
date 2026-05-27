'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePublicClient } from 'wagmi';
import { ReviewResultCard } from '@/components/ReviewResultCard';

const STORAGE_KEY = 'queryFormState';

type ReviewData = {
  payload?: {
    response?: {
      requestId?: string;
      savedAt?: string;
      success?: boolean;
      data?: {
        List?: Record<string, any>;
        NumOfDatabase?: number;
        NumOfResults?: number;
      };
    };
  };
};

type PageProps = {
  params: {
    receipt_id: string;
  };
};

export default function ReviewPage({ params }: PageProps) {
  const receiptId = params.receipt_id;
  const publicClient = usePublicClient();
  const [retrievalLink, setRetrievalLink] = useState<string | null>(null);
  const [query, setQuery] = useState<string>('');
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const getStorageKeys = (chainId?: number | null) => {
    const keys = [] as string[];
    if (chainId) {
      keys.push(`${STORAGE_KEY}-${chainId}`);
    }
    keys.push(STORAGE_KEY);
    return keys;
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !publicClient) return;
    let isMounted = true;

    const loadStorage = async () => {
      try {
        const chainId = await publicClient.getChainId();
        const saved = getStorageKeys(chainId)
          .map((key) => window.localStorage.getItem(key))
          .find((item): item is string => Boolean(item));

        if (!saved) {
          if (!isMounted) return;
          setError('No saved query data found.');
          setLoading(false);
          return;
        }

        const parsed = JSON.parse(saved) as any;
        const storedData = Array.isArray(parsed?.dataRecords)
          ? parsed.dataRecords.find((d: any) => String(d.requestId) === receiptId)
          : null;
        const storedReceipt = Array.isArray(parsed?.receipts)
          ? parsed.receipts.find((r: any) => String(r.requestId) === receiptId)
          : null;

        if (!storedData?.retrievalLink) {
          if (!isMounted) return;
          setQuery(storedData?.query || storedReceipt?.query || '');
          setError('No retrieval link found for this receipt. Generate the link first.');
          setLoading(false);
          return;
        }

        if (!isMounted) return;
        setRetrievalLink(storedData.retrievalLink);
        setQuery(storedData.query || storedReceipt?.query || '');
      } catch (err) {
        if (!isMounted) return;
        console.error(err);
        setError('Failed to read saved review data.');
        setLoading(false);
      }
    };

    loadStorage();
    return () => {
      isMounted = false;
    };
  }, [receiptId, publicClient]);

  useEffect(() => {
    if (!retrievalLink) return;

    setLoading(true);
    window.fetch(retrievalLink)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch review data: ${res.status}`);
        }
        return res.json();
      })
      .then((json) => {
        setReviewData(json as ReviewData);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setLoading(false));
  }, [retrievalLink]);

  const renderListCards = () => {
    const list = reviewData?.payload?.response?.data?.List;
    if (!list || typeof list !== 'object') {
      return (
        <pre className="rounded-3xl bg-slate-900 p-4 text-xs text-slate-100 whitespace-pre-wrap break-words">
          {JSON.stringify(reviewData, null, 2)}
        </pre>
      );
    }

    return Object.entries(list).map(([title, section]) => {
      const items = Array.isArray(section?.Data) ? section.Data : [];
      const infoLeak = section?.InfoLeak ?? section?.infoLeak;
      const numOfResults = section?.NumOfResults ?? section?.numOfResults ?? (items.length || 0);

      return (
        <div key={title} className="rounded-3xl border border-slate-700 bg-slate-950/90 p-4 shadow-lg shadow-slate-950/30">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-100">{title}</h2>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
              {numOfResults} result{numOfResults === 1 ? '' : 's'}
            </span>
          </div>
          {infoLeak ? <p className="mb-3 text-xs leading-5 text-slate-300">{infoLeak}</p> : null}
          <div className="grid gap-3">
            {items.length > 0 ? (
              items.slice(0, 5).map((item: any, index: number) => (
                <div key={index} className="rounded-2xl bg-slate-900 p-3 text-[11px] leading-5 text-slate-100">
                  <pre className="whitespace-pre-wrap break-words">{JSON.stringify(item, null, 2)}</pre>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-900 p-3 text-xs text-slate-400">No data in this section.</div>
            )}
            {items.length > 5 ? <div className="text-right text-[11px] text-slate-400">+{items.length - 5} more rows</div> : null}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="mx-auto w-full max-w-5xl rounded-3xl border border-slate-800 bg-slate-950/80 p-6 text-slate-100">
      <div className="mb-6 flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-900/80 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Review Result</p>
          <h1 className="mt-2 text-xl font-semibold text-slate-100">Receipt #{receiptId}</h1>
          <p className="mt-1 text-sm text-slate-400">Query: {query || 'N/A'}</p>
          {(reviewData?.payload?.response?.data?.NumOfDatabase || reviewData?.payload?.response?.data?.NumOfResults) ? (
            <p className="mt-1 text-xs text-slate-500">
              {reviewData.payload?.response?.data?.NumOfDatabase ? `${reviewData.payload?.response?.data?.NumOfDatabase} source${reviewData.payload?.response?.data?.NumOfDatabase === 1 ? '' : 's'}` : ''}
              {reviewData.payload?.response?.data?.NumOfDatabase && reviewData.payload?.response?.data?.NumOfResults ? ' · ' : ''}
              {reviewData.payload?.response?.data?.NumOfResults ? `${reviewData.payload?.response?.data?.NumOfResults} result${reviewData.payload?.response?.data?.NumOfResults === 1 ? '' : 's'}` : ''}
            </p>
          ) : null}
          {retrievalLink ? <p className="mt-1 text-xs text-slate-500">Retrieval link loaded</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/"
            className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
          >
            Back to search
          </Link>
          {retrievalLink ? (
            <a
              href={retrievalLink}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-2xl border border-cyan-500 bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Open original link
            </a>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-center text-sm text-slate-400">Loading review data…</div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-600 bg-rose-950/20 p-6 text-sm text-rose-200">{error}</div>
      ) : reviewData ? (
        <div className="grid gap-4">
          {Object.entries(reviewData.payload?.response?.data?.List ?? {}).map(([title, section], index) => (
            <ReviewResultCard key={title} title={title} section={section} index={index} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-sm text-slate-400">No review data available.</div>
      )}
    </div>
  );
}
