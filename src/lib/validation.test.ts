import { describe, expect, it } from "vitest";
import {
  isMarketSide,
  isOpaqueSessionId,
  isPositiveUsdcAmount,
  isSlippageBps,
  isSolanaPublicKey,
  isSolanaSignature,
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
});
