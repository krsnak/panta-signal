import { describe, expect, it } from "vitest";
import {
  isMarketSide,
  isOpaqueSessionId,
  isPantaCategory,
  isPublicHttpUrl,
  isPositiveUsdcAmount,
  isSlippageBps,
  isSolanaPublicKey,
  isSolanaSignature,
  isUnixSecond,
} from "./validation";

describe("Solana/Panta input validation", () => {
  it("validates Solana public keys", () => {
    expect(isSolanaPublicKey("11111111111111111111111111111111")).toBe(true);
    expect(isSolanaPublicKey("not-a-wallet")).toBe(false);
  });

  it("accepts only yes/no sides", () => {
    expect(isMarketSide("yes")).toBe(true);
    expect(isMarketSide("no")).toBe(true);
    expect(isMarketSide("YES")).toBe(false);
  });

  it("accepts positive USDC strings with up to 6 decimals", () => {
    expect(isPositiveUsdcAmount("5.00")).toBe(true);
    expect(isPositiveUsdcAmount("0.000001")).toBe(true);
    expect(isPositiveUsdcAmount("0")).toBe(false);
    expect(isPositiveUsdcAmount("-1")).toBe(false);
    expect(isPositiveUsdcAmount("1.0000001")).toBe(false);
  });

  it("bounds slippage to Panta's documented maximum", () => {
    expect(isSlippageBps(100)).toBe(true);
    expect(isSlippageBps(5000)).toBe(true);
    expect(isSlippageBps(5001)).toBe(false);
    expect(isSlippageBps(1.5)).toBe(false);
  });

  it("validates opaque quote/order ids conservatively", () => {
    expect(isOpaqueSessionId("qt_abc123")).toBe(true);
    expect(isOpaqueSessionId("ord_abc-123")).toBe(true);
    expect(isOpaqueSessionId("x")).toBe(false);
  });

  it("validates base58 transaction signature shape", () => {
    expect(isSolanaSignature("1".repeat(88))).toBe(true);
    expect(isSolanaSignature("0".repeat(88))).toBe(false);
    expect(isSolanaSignature("short")).toBe(false);
  });

  it("accepts only documented Panta categories", () => {
    expect(isPantaCategory("crypto")).toBe(true);
    expect(isPantaCategory("finance")).toBe(true);
    expect(isPantaCategory("memes")).toBe(false);
  });

  it("accepts public http(s) image URLs and rejects local hosts", () => {
    expect(isPublicHttpUrl("https://panta-signal.vercel.app/panta-signal-market.svg")).toBe(true);
    expect(isPublicHttpUrl("http://localhost:3000/image.png")).toBe(false);
    expect(isPublicHttpUrl("file:///tmp/image.png")).toBe(false);
  });

  it("validates unix-second timestamps", () => {
    expect(isUnixSecond(1_800_000_000)).toBe(true);
    expect(isUnixSecond(1.5)).toBe(false);
    expect(isUnixSecond(-1)).toBe(false);
  });
});
