import { describe, expect, it } from "vitest";

const BTC_BELOW_58K = "69A5oC4BXuHC1hG6EVpLZbgSH4GQGVBMgQKwHz3YhbZk";
const runLive = process.env.PANTA_ORDERBOOK_LIVE === "1";

describe.skipIf(!runLive)("live Panta on-chain order book diagnostic", () => {
  it("prints a current read-only reconstruction", async () => {
    const { readPantaOrderBook } = await import("./panta-orderbook");
    const marketId = process.env.PANTA_MARKET_ID?.trim() || BTC_BELOW_58K;
    const orderBook = await readPantaOrderBook(marketId);

    process.stdout.write(`${JSON.stringify(orderBook, null, 2)}\n`);
    expect(orderBook.source).toBe("solana-onchain");
    expect(orderBook.marketId).toBe(marketId);
  }, 20_000);
});

