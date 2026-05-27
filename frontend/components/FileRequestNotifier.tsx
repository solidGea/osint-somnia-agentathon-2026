"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { Contract, WebSocketProvider } from "ethers";

const STORAGE_KEY = "queryFormState";
const SOMNIA_TESTNET_WS = "wss://api.infra.testnet.somnia.network/ws";
const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_FILE_REQUEST_ADDRESS ||
  "0x0000000000000000000000000000000000000000"; // placeholder zero address if not defined

const abi = [
  "event RequestCreated(uint256 indexed requestId, address indexed requester, string queryType, string target)",
  "event RequestCompleted(uint256 indexed requestId, bytes32 responseHash, uint8 status)"
];

const formatStatus = (status: unknown) => {
  if (typeof status === "number" || typeof status === "bigint") return status.toString();
  if (typeof status === "string") return status;
  return String(status);
};

const isLookupQuery = (queryType: string) => queryType.toLowerCase().includes("lookup");

const maskLookupTarget = (target: string) => {
  if (!target) return "*******";
  const prefix = target.slice(0, 3);
  return `${prefix}*******`;
};

const shortAddress = (address: string) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;

const getToastOptions = () => ({
  position: "top-center" as const,
  duration: 8000,
  className: "bg-slate-950/95 text-slate-100 border border-slate-700 shadow-xl",
  style: {
    background: "rgba(15, 23, 42, 0.95)",
    color: "#f8fafc",
    border: "1px solid rgba(148, 163, 184, 0.16)",
  },
});

const FileRequestNotifier = () => {
  const { address } = useAccount();
  const providerRef = useRef<WebSocketProvider | null>(null);
  const contractRef = useRef<Contract | null>(null);
  const keepAliveRef = useRef<number | null>(null);
  const ownRequestIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const state = JSON.parse(stored) as { receipts?: Array<{ requestId: string }> };
        const ids = new Set<string>();
        state?.receipts?.forEach((receipt) => {
          if (receipt?.requestId) {
            ids.add(String(receipt.requestId));
          }
        });
        ownRequestIdsRef.current = ids;
      }
    } catch {
      ownRequestIdsRef.current = new Set();
    }
  }, [address]);

  useEffect(() => {
    if (!CONTRACT_ADDRESS) {
      console.warn("NEXT_PUBLIC_FILE_REQUEST_ADDRESS is not defined.");
      return;
    }

    let active = true;

    const subscribe = async () => {
      try {
        const provider = new WebSocketProvider(SOMNIA_TESTNET_WS);
        providerRef.current = provider;

        const contract = new Contract(CONTRACT_ADDRESS, abi, provider);
        contractRef.current = contract;

        const handleRequestCreated = (
          requestId: unknown,
          requester: string,
          queryType: string,
          target: string,
        ) => {
          if (!active) return;
          if (address && requester?.toLowerCase() === address.toLowerCase()) return;

          const requestIdText = String(requestId);
          const lookup = isLookupQuery(queryType);
          const title = lookup
            ? `Someone lookup ${maskLookupTarget(target)}`
            : `New request created #${requestIdText}`;
          const description = lookup
            ? `by ${shortAddress(requester)}`
            : `${queryType} → ${target}`;

          toast(title, {
            description,
            ...getToastOptions(),
          });
        };

        // RequestCompleted notifications are disabled for now.
        // const handleRequestCompleted = (
        //   requestId: unknown,
        //   _responseHash: string,
        //   status: unknown,
        // ) => {
        //   if (!active) return;
        //   const requestIdText = String(requestId);
        //   if (ownRequestIdsRef.current.has(requestIdText)) return;

        //   toast.success(`Request completed #${requestIdText}`, {
        //     description: `Status: ${formatStatus(status)}`,
        //     ...getToastOptions(),
        //   });
        // };

        contract.on("RequestCreated", handleRequestCreated);

        keepAliveRef.current = window.setInterval(async () => {
          try {
            await provider.getBlockNumber();
          } catch {
            // ignore keep-alive errors
          }
        }, 30000);
      } catch (error) {
        toast.error("Failed to connect WebSocket events", {
          description: error instanceof Error ? error.message : String(error),
          ...getToastOptions(),
        });
      }
    };

    subscribe();

    return () => {
      active = false;

      const contract = contractRef.current;
      if (contract) {
        contract.removeAllListeners("RequestCreated");
        contract.removeAllListeners("RequestCompleted");
      }

      const provider = providerRef.current;
      if (provider) {
        try {
          provider.destroy?.();
        } catch {
          provider.websocket?.close();
        }
      }

      if (keepAliveRef.current !== null) {
        window.clearInterval(keepAliveRef.current);
      }
    };
  }, []);

  return null;
};

export default FileRequestNotifier;
