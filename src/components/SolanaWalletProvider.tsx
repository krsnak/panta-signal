"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { VersionedTransaction } from "@solana/web3.js";

export type SolanaProvider = {
  isPhantom?: boolean;
  isConnected?: boolean;
  publicKey?: { toString(): string } | null;
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>;
  disconnect?(): Promise<void>;
  signAndSendTransaction(transaction: VersionedTransaction): Promise<{ signature: string }>;
  on?(event: "connect" | "disconnect" | "accountChanged", callback: (value?: unknown) => void): void;
  off?(event: "connect" | "disconnect" | "accountChanged", callback: (value?: unknown) => void): void;
};

type WalletContextValue = {
  wallet: string;
  provider: SolanaProvider | null;
  available: boolean;
  connecting: boolean;
  disconnecting: boolean;
  error: string | null;
  connect(): Promise<string>;
  disconnect(): Promise<void>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

function detectProvider() {
  if (typeof window === "undefined") return null;
  const browser = window as typeof window & {
    solana?: SolanaProvider;
    phantom?: { solana?: SolanaProvider };
  };
  const phantom = browser.phantom?.solana;
  if (phantom?.isPhantom) return phantom;
  const legacy = browser.solana;
  if (legacy?.isPhantom) return legacy;
  return null;
}

export default function SolanaWalletProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<SolanaProvider | null>(null);
  const [wallet, setWallet] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const detected = detectProvider();
    const initialSync = window.setTimeout(() => {
      setProvider(detected);
      if (detected?.isConnected && detected.publicKey) {
        setWallet(detected.publicKey.toString());
      } else {
        setWallet("");
      }
    }, 0);

    const handleConnect = (value?: unknown) => {
      const publicKey = value as { toString?(): string } | undefined;
      const next = publicKey?.toString?.() ?? detected?.publicKey?.toString() ?? "";
      setWallet(next);
      setError(null);
    };
    const handleDisconnect = () => {
      setWallet("");
      setError(null);
    };
    const handleAccountChanged = (value?: unknown) => {
      const publicKey = value as { toString?(): string } | null | undefined;
      setWallet(publicKey?.toString?.() ?? "");
    };

    detected?.on?.("connect", handleConnect);
    detected?.on?.("disconnect", handleDisconnect);
    detected?.on?.("accountChanged", handleAccountChanged);

    return () => {
      window.clearTimeout(initialSync);
      detected?.off?.("connect", handleConnect);
      detected?.off?.("disconnect", handleDisconnect);
      detected?.off?.("accountChanged", handleAccountChanged);
    };
  }, []);

  const connect = useCallback(async () => {
    const detected = provider ?? detectProvider();
    if (!detected) {
      const message = "No Solana browser wallet detected. Install or open Phantom.";
      setError(message);
      throw new Error(message);
    }

    try {
      setConnecting(true);
      setError(null);
      if (!provider) setProvider(detected);
      const result = await detected.connect();
      const publicKey = result.publicKey.toString();
      setWallet(publicKey);
      return publicKey;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Wallet connection failed.";
      setError(message);
      throw error instanceof Error ? error : new Error(message);
    } finally {
      setConnecting(false);
    }
  }, [provider]);

  const disconnect = useCallback(async () => {
    try {
      setDisconnecting(true);
      await provider?.disconnect?.();
    } finally {
      setWallet("");
      setError(null);
      setDisconnecting(false);
    }
  }, [provider]);

  const value = useMemo(
    () => ({
      wallet,
      provider,
      available: Boolean(provider),
      connecting,
      disconnecting,
      error,
      connect,
      disconnect,
    }),
    [wallet, provider, connecting, disconnecting, error, connect, disconnect],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useSolanaWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useSolanaWallet must be used inside SolanaWalletProvider");
  return context;
}
