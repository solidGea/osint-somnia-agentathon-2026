'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { decodeEventLog, type Abi, type Hash } from 'viem';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { toast } from 'sonner';
import Link from 'next/link';
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { FileSearch } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Carousel } from '@/components/ui/carousel';
import { versionList } from '@/lib/version-list';

const FILE_REQUEST_ADDRESS = process.env.NEXT_PUBLIC_FILE_REQUEST_ADDRESS ?? '0xdacd846bacae495c9a8a7371c845bcb29b4b1705';
const QUERY_TYPE = process.env.NEXT_PUBLIC_QUERY_TYPE_SC ?? 'lookup-mock';
const STORAGE_KEY = process.env.NEXT_PUBLIC_STORAGE_KEY ?? 'queryState';
const RETRIEVAL_BASE_URL = process.env.NEXT_PUBLIC_RETRIEVAL_BASE_URL ?? 'https://unknown.hosts';
const PAGE_SIZE = 5;

const FILE_REQUEST_ABI: Abi = [
  // --- read ---
  {
    inputs: [],
    name: 'getRequiredDeposit',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getAgentDeposit',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'pure',
    type: 'function'
  },
  {
    inputs: [],
    name: 'additionalFee',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'feeRecipient',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  // --- write (payable) ---
  {
    inputs: [
      { internalType: 'string', name: 'queryType', type: 'string' },
      { internalType: 'string', name: 'target', type: 'string' },
      { internalType: 'string', name: 'apiKey', type: 'string' }
    ],
    name: 'requestData',
    outputs: [{ internalType: 'uint256', name: 'requestId', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'string', name: 'target', type: 'string' }],
    name: 'requestStringLookup',
    outputs: [{ internalType: 'uint256', name: 'requestId', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'string', name: 'queryType', type: 'string' },
      { internalType: 'string', name: 'target', type: 'string' },
      { internalType: 'string', name: 'selector', type: 'string' }
    ],
    name: 'requestDataWithSelector',
    outputs: [{ internalType: 'uint256', name: 'requestId', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function'
  },
  // --- write (owner) ---
  {
    inputs: [{ internalType: 'address', name: 'newRecipient', type: 'address' }],
    name: 'setFeeRecipient',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: 'newFee', type: 'uint256' }],
    name: 'setAdditionalFee',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'string', name: 'newBaseUrl', type: 'string' }],
    name: 'setBaseUrl',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  // --- events ---
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: 'uint256', name: 'requestId', type: 'uint256' },
      { indexed: true,  internalType: 'address', name: 'requester', type: 'address' },
      { indexed: false, internalType: 'string',  name: 'queryType', type: 'string' },
      { indexed: false, internalType: 'string',  name: 'target',    type: 'string' }
    ],
    name: 'RequestCreated',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: 'uint256',  name: 'requestId',    type: 'uint256' },
      { indexed: false, internalType: 'bytes32',  name: 'responseHash', type: 'bytes32' },
      { indexed: false, internalType: 'uint8',    name: 'status',       type: 'uint8' }
    ],
    name: 'RequestCompleted',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'address', name: 'oldRecipient', type: 'address' },
      { indexed: false, internalType: 'address', name: 'newRecipient', type: 'address' }
    ],
    name: 'FeeRecipientUpdated',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'uint256', name: 'oldFee', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'newFee', type: 'uint256' }
    ],
    name: 'AdditionalFeeUpdated',
    type: 'event'
  }
]; // v2


interface ReceiptData {
  txHash: string;
  requestId: string;
  query: string;
  deposit: string;
  createdAt: number;
  retrievalLink?: string;
}

interface DataRecord {
  requestId: string;
  retrievalLink: string;
  retrievedAt: number;
  query: string;
}

interface proxyQuota {
  used: number;
  limit: number;
  remaining: number;
  bucket: string;
  resetAt: string;
  periodStart: string;
  periodEnd: string;
  usedLimit: string;
}

interface QueryFormState {
  receipts: ReceiptData[];
  dataRecords: DataRecord[];
}

function formatDeposit(value: bigint): string {
  const total = value.toString().padStart(19, '0');
  const integerPart = total.slice(0, -18);
  const fractionalPart = total.slice(-18).slice(0, 2).padEnd(2, '0');
  return `${integerPart},${fractionalPart}`;
}

function formatShortHash(hash: string) {
  if (!hash) return hash;
  if (hash.startsWith('0x') && hash.length > 10) {
    return `0x${hash.slice(2, 6)}...${hash.slice(-4)}`;
  }
  return hash.length > 8 ? `${hash.slice(0, 4)}...${hash.slice(-4)}` : hash;
}

function ReceiptTable({ receipts, explorerBase, receiptExplorerBase, onRetrieveLink, retrievingId, startIndex, total, currentPage, pageCount, onPrevPage, onNextPage }: {
  receipts: ReceiptData[];
  explorerBase: string;
  receiptExplorerBase: string;
  onRetrieveLink: (r: ReceiptData) => void;
  retrievingId: string | null;
  startIndex: number;
  total: number;
  currentPage: number;
  pageCount: number;
  onPrevPage: () => void;
  onNextPage: () => void;
}) {
  const columnHelper = createColumnHelper<ReceiptData>();

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'no',
        header: 'No',
        cell: ({ row }) => startIndex + row.index + 1,
      }),
      columnHelper.accessor('query', {
        header: 'Query',
        cell: info => <div className="break-all text-left text-slate-100">{info.getValue()}</div>,
      }),
      columnHelper.accessor('requestId', {
        header: 'Receipt ID',
        cell: info => (
          <a
            href={`${receiptExplorerBase}/receipts/${info.getValue()}`}
            target="_blank"
            rel="noreferrer noopener"
            className="text-cyan-300 hover:underline"
          >
            {info.getValue()}
          </a>
        ),
      }),
      columnHelper.display({
        id: 'txHash',
        header: 'Tx',
        cell: ({ row }) => (
          <div className="hidden md:block">
            <a
              href={`${explorerBase}/tx/${row.original.txHash}`}
              target="_blank"
              rel="noreferrer noopener"
              className="text-cyan-300 hover:underline"
            >
              {formatShortHash(row.original.txHash)}
            </a>
          </div>
        ),
      }),
      columnHelper.display({
        id: 'action',
        header: 'Action',
        cell: ({ row }) => {
          const receipt = row.original;
          return (
            <button
              type="button"
              onClick={() => onRetrieveLink(receipt)}
              disabled={retrievingId === receipt.requestId}
              className="rounded-md bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {retrievingId === receipt.requestId ? 'Retrieving...' : receipt.retrievalLink ? 'Re-sign' : 'Retrieve Link'}
            </button>
          );
        },
      }),
    ],
    [columnHelper, explorerBase, receiptExplorerBase, onRetrieveLink, retrievingId, startIndex]
  );

  const table = useReactTable({ data: receipts, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="p-4 overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-800 text-xs">
        <thead className="border-b border-slate-800">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  className="px-3 py-2 text-left uppercase tracking-[0.24em] text-slate-500"
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-800">
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="bg-slate-950/95">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-3 py-3 align-top text-slate-200">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {receipts.length > 0 && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-400">
          <div>Showing {receipts.length} of {total} receipts</div>
          {pageCount > 1 && (
            <div className="inline-flex items-center gap-2">
              <button
                type="button"
                onClick={onPrevPage}
                disabled={currentPage === 1}
                className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prev
              </button>
              <span>Page {currentPage} / {pageCount}</span>
              <button
                type="button"
                onClick={onNextPage}
                disabled={currentPage === pageCount}
                className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DataTable({ dataRecords, startIndex, total, currentPage, pageCount, onPrevPage, onNextPage }: {
  dataRecords: DataRecord[];
  startIndex: number;
  total: number;
  currentPage: number;
  pageCount: number;
  onPrevPage: () => void;
  onNextPage: () => void;
}) {
  const columnHelper = createColumnHelper<DataRecord>();

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'no',
        header: 'No',
        cell: ({ row }) => startIndex + row.index + 1,
      }),
      columnHelper.accessor('query', {
        header: 'Query',
        cell: info => <div className="break-all text-left text-slate-100">{info.getValue()}</div>,
      }),
      columnHelper.accessor('requestId', {
        header: 'Receipt ID',
        cell: info => <div className="text-slate-200">{info.getValue()}</div>,
      }),
      columnHelper.display({
        id: 'link',
        header: 'Link',
        cell: ({ row }) => (
          <Link
            href={`/review/${row.original.requestId}`}
            className="inline-flex items-center justify-center rounded-md bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            View Data
          </Link>
        ),
      }),
    ],
    [columnHelper, startIndex]
  );

  const table = useReactTable({ data: dataRecords, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="p-4 overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-800 text-xs">
        <thead className="border-b border-slate-800">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  className="px-3 py-2 text-left uppercase tracking-[0.24em] text-slate-500"
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-800">
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="bg-slate-950/95">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-3 py-3 align-top text-slate-200">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {total > 0 && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-400">
          <div>Showing {dataRecords.length} of {total} records</div>
          {pageCount > 1 && (
            <div className="inline-flex items-center gap-2">
              <button
                type="button"
                onClick={onPrevPage}
                disabled={currentPage === 1}
                className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prev
              </button>
              <span>Page {currentPage} / {pageCount}</span>
              <button
                type="button"
                onClick={onNextPage}
                disabled={currentPage === pageCount}
                className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function QueryForm() {
  const { isConnected, address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [query, setQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [deposit, setDeposit] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [dataRecords, setDataRecords] = useState<DataRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'intro' | 'lookup' | 'receipt' | 'data' | 'info' | 'version' | 'dripper'>('intro');
  const [nativeSymbol, setNativeSymbol] = useState('ETH');
  const [explorerBase, setExplorerBase] = useState('https://explorer.somnia.network');
  const [receiptExplorerBase, setReceiptExplorerBase] = useState('https://agents.somnia.network');
  const [retrievingId, setRetrievingId] = useState<string | null>(null);
  const [receiptPage, setReceiptPage] = useState(1);
  const [dataPage, setDataPage] = useState(1);
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [proxyQuota, setproxyQuota] = useState<proxyQuota | null>(null);
  const [aceLogicLoading, setPrivLoading] = useState(false);
  const [aceLogicError, setPrivError] = useState<string | null>(null);

  const latestVersion = versionList[0];

  const getStorageKey = (chainId: number | null) =>
    chainId ? `${STORAGE_KEY}-${chainId}` : STORAGE_KEY;

  const loadStoredState = (chainId: number) => {
    if (typeof window === 'undefined') return;

    const saved = window.localStorage.getItem(getStorageKey(chainId));
    if (!saved) {
      setReceipts([]);
      setDataRecords([]);
      setReceiptPage(1);
      setDataPage(1);
      return;
    }

    try {
      const parsed = JSON.parse(saved) as any;
      let loadedReceipts: ReceiptData[] = [];
      let loadedDataRecords: DataRecord[] = [];

      if (Array.isArray(parsed?.receipts)) {
        loadedReceipts = (parsed.receipts as any[])
          .filter(r => r?.txHash && r?.requestId)
          .map((r) => ({
            ...r,
            query: typeof r.query === 'string' ? r.query : '',
            createdAt: typeof r.createdAt === 'number' ? r.createdAt : 0
          }));
      } else if (parsed?.receipt?.txHash && parsed?.receipt?.requestId) {
        loadedReceipts = [{
          ...parsed.receipt,
          query: typeof parsed.receipt.query === 'string' ? parsed.receipt.query : '',
          createdAt: typeof parsed.receipt.createdAt === 'number' ? parsed.receipt.createdAt : 0
        }];
      }

      if (Array.isArray(parsed?.dataRecords)) {
        loadedDataRecords = (parsed.dataRecords as any[])
          .filter(d => d?.requestId && d?.retrievalLink)
          .map((d) => ({
            ...d,
            retrievedAt: typeof d.retrievedAt === 'number' ? d.retrievedAt : 0,
            query: typeof d.query === 'string' ? d.query : ''
          }));
      } else if (parsed?.dataRecord?.requestId && parsed?.dataRecord?.retrievalLink) {
        loadedDataRecords = [{
          ...parsed.dataRecord,
          retrievedAt: typeof parsed.dataRecord.retrievedAt === 'number' ? parsed.dataRecord.retrievedAt : 0,
          query: typeof parsed.dataRecord.query === 'string' ? parsed.dataRecord.query : ''
        }];
      }

      setReceipts(loadedReceipts);
      setDataRecords(loadedDataRecords.map((dr) => ({
        ...dr,
        query: dr.query || new Map<string, string>(loadedReceipts.map((r) => [r.requestId, r.query])).get(dr.requestId) || ''
      })));
      setReceiptPage(1);
      setDataPage(1);

      if (loadedReceipts.length > 0) {
        setActiveTab('receipt');
      }
    } catch {
      setReceipts([]);
      setDataRecords([]);
      setReceiptPage(1);
      setDataPage(1);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || currentChainId === null) return;
    loadStoredState(currentChainId);
  }, [currentChainId]);

  useEffect(() => {
    if (!publicClient) return;

    const loadSymbol = async () => {
      try {
        const chainId = await publicClient.getChainId();
        setCurrentChainId(chainId);
        switch (chainId) {
          case 5031:
            setNativeSymbol('SOMI');
            setExplorerBase('https://explorer.somnia.network');
            setReceiptExplorerBase('https://agents.somnia.network');
            break;
          case 50312:
            setNativeSymbol('STT');
            setExplorerBase('https://shannon-explorer.somnia.network');
            setReceiptExplorerBase('https://agents.testnet.somnia.network');
            break;
          default:
            setNativeSymbol('ETH');
            setExplorerBase('https://explorer.somnia.network');
            setReceiptExplorerBase('https://agents.somnia.network');
        }
      } catch {
        setNativeSymbol('ETH');
        setExplorerBase('https://explorer.somnia.network');
        setReceiptExplorerBase('https://agents.somnia.network');
      }
    };

    loadSymbol();
  }, [publicClient]);

  const receiptPageCount = Math.max(1, Math.ceil(receipts.length / PAGE_SIZE));
  const sortedReceipts = [...receipts].sort((a, b) => {
    const diff = b.createdAt - a.createdAt;
    if (diff !== 0) return diff;
    return Number(b.requestId) - Number(a.requestId);
  });
  const displayedReceipts = sortedReceipts.slice((receiptPage - 1) * PAGE_SIZE, receiptPage * PAGE_SIZE);
  const dataPageCount = Math.max(1, Math.ceil(dataRecords.length / PAGE_SIZE));
  const sortedDataRecords = [...dataRecords].sort((a, b) => {
    const diff = b.retrievedAt - a.retrievedAt;
    if (diff !== 0) return diff;
    return Number(b.requestId) - Number(a.requestId);
  });
  const displayedDataRecords = sortedDataRecords.slice((dataPage - 1) * PAGE_SIZE, dataPage * PAGE_SIZE);

  useEffect(() => {
    if (receiptPage > receiptPageCount) {
      setReceiptPage(receiptPageCount);
    }
  }, [receiptPage, receiptPageCount]);

  useEffect(() => {
    if (dataPage > dataPageCount) {
      setDataPage(dataPageCount);
    }
  }, [dataPage, dataPageCount]);

  const saveState = (newReceipts: ReceiptData[], newDataRecords: DataRecord[]) => {
    if (typeof window === 'undefined' || currentChainId === null) return;
    window.localStorage.setItem(getStorageKey(currentChainId), JSON.stringify({ receipts: newReceipts, dataRecords: newDataRecords } as QueryFormState));
  };

  const handleClearStorage = () => {
    if (typeof window !== 'undefined') {
      if (currentChainId !== null) {
        window.localStorage.removeItem(getStorageKey(currentChainId));
      }
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setReceipts([]);
    setDataRecords([]);
    setReceiptPage(1);
    setDataPage(1);
    setActiveTab('lookup');
    setError(null);
    setStatus('Cleared stored receipts and data.');
    toast.success('Stored data reset');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!query.trim()) {
      setError('Enter a lookup query before submitting.');
      return;
    }

    if (!isConnected) {
      setError('Connect your wallet.');
      return;
    }

    if (!FILE_REQUEST_ADDRESS) {
      setError('Contract address is not configured. Set NEXT_PUBLIC_FILE_REQUEST_ADDRESS.');
      return;
    }

    if (!publicClient || !walletClient) {
      setError('Wallet client is not ready. Please refresh and reconnect.');
      return;
    }

      if (!address) {
        setError('Unable to get wallet address. Please reconnect.');
        return;
      }

    try {
      const target = query.trim();
      const encodedTarget = encodeURIComponent(target);
      const requiredDeposit = (await publicClient.readContract({
        address: FILE_REQUEST_ADDRESS as `0x${string}`,
        abi: FILE_REQUEST_ABI,
        functionName: 'getRequiredDeposit'
      })) as bigint;

      setDeposit(requiredDeposit);
      setStatus(`Requesting one-time API key...`);

      const apiKeyResponse = await fetch('/privServer/getApiKey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      const apiKeyPayload = await apiKeyResponse.json();
      if (!apiKeyResponse.ok || !apiKeyPayload.success || !apiKeyPayload.apiKey) {
        throw new Error(`Failed to fetch API key: ${apiKeyPayload.error || apiKeyResponse.statusText}`);
      }

      const apiKey = apiKeyPayload.apiKey as string;
      setStatus(`Sending request with deposit ${formatDeposit(requiredDeposit)}...`);

      const txHashResult = await (walletClient as any).writeContract({
        address: FILE_REQUEST_ADDRESS as `0x${string}`,
        abi: FILE_REQUEST_ABI,
        functionName: 'requestData',
        args: [QUERY_TYPE, encodedTarget, apiKey],
        value: requiredDeposit,
      });

      if (typeof txHashResult !== 'string') {
        throw new Error('Unexpected transaction hash returned.');
      }

      setStatus('Transaction sent, waiting for confirmation...');
      const receiptResult = await publicClient.waitForTransactionReceipt({ hash: txHashResult as Hash });
      setStatus('Transaction confirmed. Parsing request ID...');

      let foundRequestId: string | null = null;
      for (const log of receiptResult.logs ?? []) {
        try {
          const parsedLog = decodeEventLog({
            abi: FILE_REQUEST_ABI,
            data: log.data,
            topics: log.topics as any
          }) as any;

          const eventName = parsedLog?.eventName ?? parsedLog?.name;
          if (eventName === 'RequestCreated') {
            const eventArgs = parsedLog.args || parsedLog;
            const id = eventArgs?.requestId ?? eventArgs?.[0];
            if (id !== undefined) {
              foundRequestId = String(id);
              break;
            }
          }
        } catch {
          // ignore logs that do not match the FileRequest ABI
        }
      }

      if (!foundRequestId) {
        setStatus('Request created, but request ID was not found in logs.');
        toast.error('Lookup request submitted, but request ID was not found.', {
          description: 'The transaction succeeded but the receipt parsing could not extract the request ID.'
        });
      } else {
        const receiptData: ReceiptData = {
          txHash: txHashResult,
          requestId: foundRequestId,
          query: target,
          deposit: formatDeposit(requiredDeposit),
          createdAt: Date.now()
        };
        const newReceipts = [receiptData, ...receipts.filter(r => r.requestId !== foundRequestId)];
        setReceipts(newReceipts);
        setReceiptPage(1);
        saveState(newReceipts, dataRecords);
        setActiveTab('receipt');
        setStatus('Request submitted successfully. Click Retrieve Link to sign and fetch the retrieval URL.');
        toast.success('Lookup submitted', {
          description: `Request ID ${foundRequestId} created successfully.`
        });
      }

      setQuery('');
    } catch (err) {
      console.error(err);
      const message = (err as Error)?.message ?? 'Transaction failed.';
      setError(message);
      setStatus('');
      toast.error('Lookup failed', { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetrieveLink = async (targetReceipt: ReceiptData) => {
    if (!walletClient) {
      setError('Wallet client is not ready. Please refresh and reconnect.');
      return;
    }
    setRetrievingId(targetReceipt.requestId);
    setError(null);
    setStatus('Signing retrieval request...');

    try {
      const message = `osint-file-access:${targetReceipt.requestId}`;
      const signature = await (walletClient as any).signMessage({ message });
      if (typeof signature !== 'string') {
        throw new Error('Unexpected signature returned.');
      }

      const retrievalLink = `${RETRIEVAL_BASE_URL.replace(/\/$/, '')}/response/${encodeURIComponent(targetReceipt.requestId)}?sig=${encodeURIComponent(signature)}`;
      const updatedReceipt = { ...targetReceipt, retrievalLink };
      const dataEntry: DataRecord = { requestId: targetReceipt.requestId, retrievalLink, retrievedAt: Date.now(), query: targetReceipt.query };
      const newReceipts = [updatedReceipt, ...receipts.filter(r => r.requestId !== targetReceipt.requestId)];
      const newDataRecords = [dataEntry, ...dataRecords.filter(d => d.requestId !== targetReceipt.requestId)];
      setReceipts(newReceipts);
      setDataRecords(newDataRecords);
      saveState(newReceipts, newDataRecords);
      setStatus('Retrieval link generated.');
      toast.success('Retrieval link created', {
        description: `Link for request ${targetReceipt.requestId} is ready.`
      });
    } catch (err) {
      console.error(err);
      const message = (err as Error)?.message ?? 'Failed to generate retrieval link.';
      setError(message);
      setStatus('');
      toast.error('Retrieval link failed', { description: message });
    } finally {
      setRetrievingId(null);
    }
  };

  const fetchPrivSvrStats = async () => {
    setPrivLoading(true);
    setPrivError(null);
    setproxyQuota(null);

    try {
      const response = await fetch('/privServer/stats');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || `Request failed with status ${response.status}`);
      }

      if (!data?.quota) {
        throw new Error('Quota data is unavailable in the response.');
      }

      setproxyQuota(data.quota as proxyQuota);
    } catch (error) {
      setPrivError(error instanceof Error ? error.message : String(error));
    } finally {
      setPrivLoading(false);
    }
  };

  // const handleLookupAgain = () => {
  //   setActiveTab('lookup');
  //   setError(null);
  //   setStatus('');
  // };

  return (
    <div className="mx-auto w-full max-w-3xl xl:max-w-4xl rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'intro' | 'lookup' | 'receipt' | 'data' | 'version' | 'dripper')} className="w-full">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <TabsList className="flex-1">
                <TabsTrigger value="intro">Intro</TabsTrigger>
                <TabsTrigger value="lookup">Lookup</TabsTrigger>
                <TabsTrigger value="receipt">Receipt</TabsTrigger>
                <TabsTrigger value="data">Data</TabsTrigger>
                <TabsTrigger value="dripper">Dripper</TabsTrigger>
                <TabsTrigger value="version">Version</TabsTrigger>
                <TabsTrigger value="info">Info</TabsTrigger>
                
             
              </TabsList>
              <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="ml-auto rounded-md border border-slate-700 bg-red-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:border-slate-500 hover:bg-red-800"
                  >
                    Clear
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Clear stored data?</DialogTitle>
                    <DialogDescription>
                      This will permanently delete stored receipts and retrieval links for the current network. You will need to submit lookups again to restore them.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <button
                        type="button"
                        className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                    </DialogClose>
                    <button
                      type="button"
                      onClick={() => {
                        handleClearStorage();
                        setConfirmOpen(false);
                      }}
                      className="rounded-md bg-red-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-red-800"
                    >
                      Clear
                    </button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

        <TabsContent value="intro">
          <Card className="p-4">
            {/* <CardHeader>
              <div className="space-y-2">
                <CardTitle>Intro</CardTitle>
                <CardDescription>Learn how to use the lookup app and manage your receipts.</CardDescription>
              </div>
            </CardHeader> */}
            <CardContent className="space-y-4 text-sm text-slate-300 text-left">
              <p className="text-left">Welcome to O{"{S}"}INT. Discover personal data and leaked credentials across the web, currently built with Somnia agent infrastructure on testnet for secure receipt-based queries, retrieval link generation, and per-network local storage isolation.</p>
              <p className="text-left">Use the tabs to navigate between the main workflows:</p>
              <ul className="list-disc space-y-2 pl-5 text-slate-400 text-left">
                <li><strong>Lookup</strong>: submit a lookup query, then generate a receipt for later retrieval.</li>
                <li><strong>Receipt</strong>: view your submitted receipts and re-sign or retrieve the response link.</li>
                <li><strong>Data</strong>: review retrieved records and access the data links.</li>
              </ul>
              <p className="text-slate-400">Need Somnia testnet funds? Use the <strong>Dripper</strong> tab to visit the testnet faucet.</p>
              <p>To get started, click the <strong>Lookup</strong> tab, enter a query, and submit. After the transaction confirms, your receipt will appear under <strong>Receipt</strong>.</p>
              <p>If you need to regenerate a retrieval link, use the <strong>Re-sign</strong> button from the Receipt tab. Once a link is generated, the Data tab shows the retrieved record.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="lookup">
          <Card className="p-4">
            {/* <CardHeader>
              <div className="space-y-2">
                <CardTitle>Lookup</CardTitle>
                <CardDescription>Submit a new lookup query and generate a receipt for retrieval.</CardDescription>
              </div>
            </CardHeader> */}
            <CardContent>
              <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, Email, IP, Anything .."
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
            />
            <button
              type="submit"
              disabled={!isConnected || isSubmitting}
              className="rounded-md bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              {isSubmitting ? 'Retrieving...' : 'Retrieve Data'}
            </button>
          </form>

          {deposit !== null && (
            <p className="mt-3 text-xs text-slate-400">
              Required deposit: {formatDeposit(deposit)}
            </p>
          )}

          {status && (
            <p className="mt-3 text-xs text-slate-400">{status}</p>
          )}

          {error && (
            <p className="mt-3 text-xs text-red-400">{error}</p>
          )}

          {!isConnected && (
            <p className="mt-3 text-xs text-slate-500">
              Connect your wallet.
            </p>
          )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipt">
          {!isConnected ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-center text-sm text-slate-400">
              Please connect your wallet to view receipts.
            </div>
          ) : receipts.length > 0 ? (
            <Card>
              {/* <CardHeader>
                <div className="space-y-2">
                  <CardTitle>Receipt</CardTitle>
                  <CardDescription>View your active receipt list and re-sign retrieval links.</CardDescription>
                </div>
              </CardHeader> */}
              <CardContent>
                <ReceiptTable
                  receipts={displayedReceipts}
                  explorerBase={explorerBase}
                  receiptExplorerBase={receiptExplorerBase}
                  onRetrieveLink={handleRetrieveLink}
                  retrievingId={retrievingId}
                  startIndex={(receiptPage - 1) * PAGE_SIZE}
                  total={receipts.length}
                  currentPage={receiptPage}
                  pageCount={receiptPageCount}
                  onPrevPage={() => setReceiptPage((prev) => Math.max(1, prev - 1))}
                  onNextPage={() => setReceiptPage((prev) => Math.min(receiptPageCount, prev + 1))}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-center text-sm text-slate-400">
              No Receipt
            </div>
          )}
        </TabsContent>

        <TabsContent value="data">
          {!isConnected ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-center text-sm text-slate-400">
              Please connect your wallet to view data records.
            </div>
          ) : dataRecords.length > 0 ? (
            <Card>
              <CardContent>
                <DataTable
                  dataRecords={displayedDataRecords}
                  startIndex={(dataPage - 1) * PAGE_SIZE}
                  total={dataRecords.length}
                  currentPage={dataPage}
                  pageCount={dataPageCount}
                  onPrevPage={() => setDataPage((prev) => Math.max(1, prev - 1))}
                  onNextPage={() => setDataPage((prev) => Math.min(dataPageCount, prev + 1))}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-center text-sm text-slate-400">
              No Data available yet. Generate the retrieval link from the Receipt tab first.
            </div>
          )}
        </TabsContent>

        <TabsContent value="version">
          <Card className="p-4">
            <CardContent>
              <Carousel
                items={versionList}
                renderItem={(item) => (
                  <div className="grid gap-4 text-left sm:grid-cols-[auto_1fr]">
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-500 text-slate-950">
                      <FileSearch className="h-10 w-10" />
                    </div>
                    <div className="space-y-3 text-left">
                      <div>
                        <div className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">{item.status ?? 'Release'}</div>
                        <h3 className="text-2xl font-semibold text-slate-100">{item.version}</h3>
                        <p className="text-sm text-slate-400">{item.date}</p>
                      </div>
                      <p className="text-sm text-slate-300">{item.summary}</p>
                      <ul className="list-disc space-y-2 pl-5 text-slate-400">
                        {item.highlights.map((highlight, index) => (
                          <li key={index}>{highlight}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info">
          <Card className="p-4">
            <CardContent className="space-y-4 text-sm text-slate-300 text-left">
              <div className="space-y-4 text-left">
                <div className="text-lg font-semibold text-slate-100">Version {latestVersion?.version ?? 'N/A'}</div>
                <ul className="list-disc pl-5 text-slate-400 text-left">
                  <li>Works only for testnet.</li>
                  <li>Data is saved locally in your browser storage.</li>
                  <li>Receipts and retrieval links are isolated per network.</li>
                  <li>Each Lookup costs 0.62 STT (Somnia Testnet)</li>
                  <li>The cost may vary on different networks.</li>
                  <li>If there are any sudden influx of requests, the cost may increase temporarily.</li>
                </ul>
                {currentChainId === 50312 ? (
                  <p className="text-sm text-slate-400">You are on Somnia Testnet. Local data saving is enabled for this version.</p>
                ) : (
                  <p className="text-sm text-rose-400">This version is only supported on Somnia Testnet. Switch networks to use local storage data.</p>
                )}
              </div>
            </CardContent>
            <CardContent className="space-y-4 text-sm text-slate-300 text-left">
              <div className="space-y-4 text-left">
                <div className="text-lg font-semibold text-slate-100">Request Capacity</div>
                <p className="text-slate-400">View our current request capacity from the private server.</p>
                <button
                  type="button"
                  onClick={fetchPrivSvrStats}
                  disabled={aceLogicLoading}
                  className="inline-flex rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {aceLogicLoading ? 'Loading...' : 'View Request Capacity'}
                </button>
                {aceLogicError && (
                  <p className="mt-3 text-sm text-rose-400">{aceLogicError}</p>
                )}
                {proxyQuota && (
                  <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/90 p-4 text-sm text-slate-200">
                    <div className="mb-2 font-semibold text-slate-100">Request Capacity</div>
                    <div>Used / Limit: <span className="font-semibold text-slate-100">{proxyQuota.usedLimit}</span></div>
                    <div>Remaining: {proxyQuota.remaining}</div>
                    {/* <div>Bucket: {proxyQuota.bucket}</div>
                    <div>Reset At: {proxyQuota.resetAt}</div>
                    <div>Period Start: {proxyQuota.periodStart}</div>
                    <div>Period End: {proxyQuota.periodEnd}</div> */}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dripper">
          <Card className="p-4">
            <CardContent className="space-y-4 text-sm text-slate-300 text-left">
              <div className="space-y-4 text-left">
                <div className="text-lg font-semibold text-slate-100">Somnia Testnet Dripper</div>
                <p className="text-slate-400">Use the Somnia Dripper faucet to fund your wallet on testnet before you submit lookups.</p>
                <a
                  href="https://somnia-dripper.netlify.app/"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  Open Somnia Dripper
                </a>
                <p className="text-xs text-slate-500">
                  Thanks to <a href="https://t.me/nikku876" target="_blank" rel="noreferrer noopener" className="font-semibold text-cyan-300 hover:underline">Nikku.Dev | 🧞</a> for the testnet dripper.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </div>
      </div>
    </div>
  );
}
