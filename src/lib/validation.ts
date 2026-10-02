import { PublicKey } from "@solana/web3.js";

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]+$/;

export function isSolanaPublicKey(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 32 || value.length > 64) return false;
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

export function isMarketSide(value: unknown): value is "yes" | "no" {
  return value === "yes" || value === "no";
}

export function isPositiveUsdcAmount(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!/^\d+(?:\.\d{1,6})?$/.test(trimmed)) return false;
  const amount = Number(trimmed);
  return Number.isFinite(amount) && amount > 0;
}

export function isSlippageBps(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 5000
  );
}

export function isOpaqueSessionId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 3 &&
    value.length <= 200 &&
    /^[A-Za-z0-9_-]+$/.test(value)
  );
}

export function isSolanaSignature(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 80 &&
    value.length <= 100 &&
    BASE58_RE.test(value)
  );
}
