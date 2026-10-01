"use client";

import { useState } from "react";
import { Buffer } from "buffer";
import {
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

type Quote = {
  quoteId: string;
  side: string;
  amountUsdc: string;
  shares: string;
  avgPrice?: string;
  feeUsdc: string;
  expiresAt: string;
  disclaimer?: string;
};

type BuiltOrder = {
  orderId: string;
  expectedShares?: string;
  feeUsdc?: string;
  recentBlockhash: string;
  instructions: Array<{
    programId: string;
    data: string;
    accounts: Array<{
      pubkey: string;
      isSigner: boolean;
      isWritable: boolean;
    }>;
  }>;
  disclaimer?: string;
};

type SolanaProvider = {
  isPhantom?: boolean;
  publicKey?: { toString(): string };
  connect(): Promise<{ publicKey: { toString(): string } }>;
  signAndSendTransaction(transaction: VersionedTransaction): Promise<{ signature: string }>;
};

function getProvider() {
  const browser = window as typeof window & {
    solana?: SolanaProvider;
    phantom?: { solana?: SolanaProvider };
  };
  return browser.phantom?.solana ?? browser.solana ?? null;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const parsed = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(parsed.error || `Request failed (${response.status})`);
  return parsed;
}

function decodeBase64(value: string) {
  return Buffer.from(value, "base64");
}

export default function PrimaryBuyPanel({ marketId, enabled }: { marketId: string; enabled: boolean }) {
  const [wallet, setWallet] = useState("");
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("5.00");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [order, setOrder] = useState<BuiltOrder | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function connectWallet() {
    const provider = getProvider();
    if (!provider) {
      setStatus("No Solana browser wallet detected. Install or open Phantom.");
      return;
    }
    try {
      setBusy(true);
      const result = await provider.connect();
      setWallet(result.publicKey.toString());
      setQuote(null);
      setOrder(null);
      setStatus("Wallet connected.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Wallet connection failed.");
    } finally {
      setBusy(false);
    }
  }

  async function requestQuote() {
    if (!wallet) return setStatus("Connect a wallet first.");
    try {
      setBusy(true);
      setOrder(null);
      const result = await postJson<Quote>("/api/panta/orders/quote", {
        wallet,
        marketId,
        side,
        amountUsdc: amount,
      });
      setQuote(result);
      setStatus("Quote ready. Review it before building the transaction.");
    } catch (error) {
      setQuote(null);
      setStatus(error instanceof Error ? error.message : "Quote failed.");
    } finally {
      setBusy(false);
    }
  }

  async function buildOrder() {
    if (!quote || !wallet) return;
    try {
      setBusy(true);
      const result = await postJson<BuiltOrder>("/api/panta/orders/build", {
        quoteId: quote.quoteId,
        wallet,
        maxSlippageBps: 100,
      });
      setOrder(result);
      setStatus("Unsigned transaction built. Your wallet will show the final signing request.");
    } catch (error) {
      setOrder(null);
      setStatus(error instanceof Error ? error.message : "Build failed.");
    } finally {
      setBusy(false);
    }
  }

  async function signAndSubmit() {
    if (!order || !wallet) return;
    const provider = getProvider();
    if (!provider) return setStatus("Solana wallet is no longer available.");

    try {
      setBusy(true);
      const instructions = order.instructions.map(
        (instruction) =>
          new TransactionInstruction({
            programId: new PublicKey(instruction.programId),
            keys: instruction.accounts.map((account) => ({
              pubkey: new PublicKey(account.pubkey),
              isSigner: account.isSigner,
              isWritable: account.isWritable,
            })),
            data: decodeBase64(instruction.data),
          }),
      );

      const message = new TransactionMessage({
        payerKey: new PublicKey(wallet),
        recentBlockhash: order.recentBlockhash,
        instructions,
      }).compileToV0Message();
      const transaction = new VersionedTransaction(message);

      setStatus("Waiting for wallet approval…");
      const sent = await provider.signAndSendTransaction(transaction);
      setStatus("Transaction broadcast. Registering signature with Panta…");

      await postJson("/api/panta/orders/submit", {
        orderId: order.orderId,
        signature: sent.signature,
        wallet,
      });

      const verified = await postJson<{ status: string }>("/api/panta/orders/verify", {
        orderId: order.orderId,
        signature: sent.signature,
        wallet,
      });
      setStatus(`Panta order status: ${verified.status}. Signature: ${sent.signature}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Signing or submission failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/15 p-5 text-sm text-white/45">
        Primary buy is available only while the market is in its primary phase.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm uppercase tracking-[0.18em] text-white/35">Non-custodial buy</div>
          <h2 className="mt-2 text-2xl font-semibold">Quote YES / NO</h2>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={connectWallet}
          className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-2.5 text-sm font-medium text-emerald-200 disabled:opacity-50"
        >
          {wallet ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : "Connect Solana wallet"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto]">
        <div className="flex rounded-xl border border-white/10 bg-black/20 p-1">
          {(["yes", "no"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => { setSide(value); setQuote(null); setOrder(null); }}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${side === value ? (value === "yes" ? "bg-emerald-300 text-[#07110d]" : "bg-rose-300 text-[#07110d]") : "text-white/45"}`}
            >
              {value.toUpperCase()}
            </button>
          ))}
        </div>
        <input
          value={amount}
          onChange={(event) => { setAmount(event.target.value); setQuote(null); setOrder(null); }}
          inputMode="decimal"
          aria-label="USDC amount"
          className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
          placeholder="5.00 USDC"
        />
        <button
          type="button"
          disabled={busy || !wallet}
          onClick={requestQuote}
          className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#07110d] disabled:opacity-40"
        >
          Get quote
        </button>
      </div>

      {quote && (
        <div className="rounded-2xl border border-white/10 bg-black/15 p-5">
          <div className="grid gap-4 sm:grid-cols-4">
            <div><div className="text-xs text-white/35">Deposit</div><div className="mt-1 font-medium">{quote.amountUsdc} USDC</div></div>
            <div><div className="text-xs text-white/35">Est. shares</div><div className="mt-1 font-medium">{quote.shares}</div></div>
            <div><div className="text-xs text-white/35">Avg. price</div><div className="mt-1 font-medium">{quote.avgPrice ?? "—"}</div></div>
            <div><div className="text-xs text-white/35">Protocol fee</div><div className="mt-1 font-medium">{quote.feeUsdc} USDC</div></div>
          </div>
          {quote.disclaimer && <p className="mt-4 text-xs leading-5 text-amber-200/70">{quote.disclaimer}</p>}
          {!order && (
            <button
              type="button"
              disabled={busy}
              onClick={buildOrder}
              className="mt-5 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/75 disabled:opacity-40"
            >
              Build unsigned transaction
            </button>
          )}
        </div>
      )}

      {order && (
        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.05] p-5">
          <p className="text-sm leading-6 text-white/60">
            {order.instructions.length > 0
              ? "Panta returned unsigned Solana instructions. Only your wallet can approve and sign them. Review the wallet prompt before broadcasting."
              : "Panta test mode returned a sandbox build preview with no on-chain instructions. Nothing can be signed or broadcast from this fixture."}
          </p>
          {order.disclaimer && <p className="mt-3 text-xs leading-5 text-amber-200/70">{order.disclaimer}</p>}
          {order.instructions.length > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={signAndSubmit}
              className="mt-4 rounded-xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-[#07110d] disabled:opacity-40"
            >
              Review, sign & send in wallet
            </button>
          )}
        </div>
      )}

      {status && <div className="text-sm leading-6 text-white/45">{status}</div>}
      <p className="text-xs leading-5 text-white/30">Market prices can move and quotes expire. This interface does not provide financial advice.</p>
    </div>
  );
}
