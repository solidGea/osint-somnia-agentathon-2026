'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAccount, usePublicClient } from 'wagmi';
import { Carousel } from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
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
  const { address: accountAddress } = useAccount();
  const [retrievalLink, setRetrievalLink] = useState<string | null>(null);
  const [query, setQuery] = useState<string>('');
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<'txt' | 'json'>('txt');
  const [downloadLoading, setDownloadLoading] = useState<boolean>(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState<boolean>(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!popoverOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setPopoverOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [popoverOpen]);

  const ownerWalletAddress = useMemo(() => {
    const data = reviewData?.payload?.response?.data as any;
    const candidates = [
      data?.owner,
      data?.ownerAddress,
      data?.owner_address,
      data?.wallet,
      data?.walletAddress,
      data?.wallet_address,
      data?.requester,
      data?.requesterAddress,
      data?.requester_address,
      data?.address
    ];

    const normalized = candidates.find((value) =>
      typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value)
    ) as string | undefined;

    return normalized ?? accountAddress ?? '';
  }, [reviewData, accountAddress]);

  const fileName = useMemo(() => {
    const ownerSegment = ownerWalletAddress ? `-${ownerWalletAddress}` : '';
    return `Receipt-${receiptId}${ownerSegment}_files.${downloadFormat}`;
  }, [receiptId, ownerWalletAddress, downloadFormat]);

  const handleDownload = async () => {
    if (!retrievalLink) return;
    setDownloadLoading(true);
    setDownloadError(null);

    try {
      const res = await fetch('/api/download-retrieval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ retrievalLink, format: downloadFormat, filename: fileName })
      });

      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Download failed: ${res.status} ${errorBody}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setDownloadError(err instanceof Error ? err.message : String(err));
    } finally {
      setDownloadLoading(false);
    }
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Back to search
            </Link>
            {retrievalLink ? (
              <div ref={popoverRef} className="relative inline-flex">
                <Button
                  type="button"
                  variant="default"
                  className="bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20"
                  onClick={() => setPopoverOpen((prev) => !prev)}
                >
                  {downloadLoading ? 'Downloading…' : 'Download retrieval file'}
                </Button>
                {popoverOpen ? (
                  <div className="absolute left-0 z-50 mt-2 min-w-[18rem] max-w-[min(22rem,calc(100vw-1rem))] rounded-3xl border border-slate-700 bg-slate-950 p-4 shadow-2xl shadow-slate-950/30">
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-slate-100">Download retrieval file</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Choose a format and save the retrieval payload for this receipt.
                      </p>
                    </div>
                    <div className="grid gap-3">
                      <div className="grid gap-2 rounded-2xl border border-slate-800 bg-slate-900/95 p-3">
                        <label className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                          Format
                        </label>
                        <select
                          value={downloadFormat}
                          onChange={(event) => setDownloadFormat(event.target.value as 'txt' | 'json')}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500"
                        >
                          <option value="txt">Plain text (.txt)</option>
                          <option value="json">JSON (.json)</option>
                        </select>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full"
                        onClick={async () => {
                          await handleDownload();
                          setPopoverOpen(false);
                        }}
                      >
                        {downloadLoading ? 'Downloading…' : 'Save receipt file'}
                      </Button>
                      <p className="text-xs text-slate-500">
                        File will be saved as <span className="font-medium text-slate-100">{fileName}</span>
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        {downloadError ? (
          <div className="mt-2 rounded-2xl border border-rose-600 bg-rose-950/20 px-4 py-3 text-xs text-rose-200">
            {downloadError}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-center text-sm text-slate-400">Loading review data…</div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-600 bg-rose-950/20 p-6 text-sm text-rose-200">{error}</div>
      ) : reviewData ? (
        <div className="grid gap-4 overflow-hidden">
          {(() => {
            const sections = Object.entries(reviewData.payload?.response?.data?.List ?? {});
            if (sections.length > 1) {
              return (
                <Carousel
                  items={sections}
                  className="space-y-4 w-full overflow-hidden"
                  controlsPosition="top"
                  renderItem={([title, section], index) => (
                    <div className="w-full">
                      <ReviewResultCard key={title} title={title} section={section} index={index} />
                    </div>
                  )}
                />
              );
            }

            return sections.map(([title, section], index) => (
              <ReviewResultCard key={title} title={title} section={section} index={index} />
            ));
          })()}
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-sm text-slate-400">No review data available.</div>
      )}
    </div>
  );
}
