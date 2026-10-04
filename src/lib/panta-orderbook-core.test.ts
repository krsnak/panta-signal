import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import {
  decodeOrderNode,
  decodePriceLevel,
  formatBaseUnits,
  isActivePriceLevel,
  isLiveOrderNode,
  normalizeOrderNode,
  PANTA_ORDER_NODE_DISCRIMINATOR,
  PANTA_ORDER_NODE_SIZE,
  PANTA_PRICE_LEVEL_DISCRIMINATOR,
  PANTA_PRICE_LEVEL_SIZE,
  sortExecutableOpportunities,
} from "./panta-orderbook-core";

const key = (byte: number) => new PublicKey(new Uint8Array(32).fill(byte));

function writeKey(buffer: Buffer, offset: number, value: PublicKey) {
  value.toBuffer().copy(buffer, offset);
}

function writeU128(buffer: Buffer, offset: number, value: bigint) {
  buffer.writeBigUInt64LE(value & ((1n << 64n) - 1n), offset);
  buffer.writeBigUInt64LE(value >> 64n, offset + 8);
}

function orderFixture() {
  const data = Buffer.alloc(PANTA_ORDER_NODE_SIZE);
  PANTA_ORDER_NODE_DISCRIMINATOR.copy(data);
  data[8] = 1;
  writeKey(data, 9, key(1));
  writeKey(data, 41, key(2));
  writeKey(data, 73, key(3));
  data.writeBigUInt64LE(2_500_000_000n, 105);
  data.writeBigUInt64LE(4_000_000_000n, 113);
  data.writeBigInt64LE(1_700_000_000n, 121);
  data[129] = 0;
  data[130] = 0;
  data[131] = 0;
  data.writeBigUInt64LE(420_000_000n, 132);
  data[140] = 254;
  data.writeBigUInt64LE(7n, 141);
  data.writeBigUInt64LE(99n, 149);
  writeKey(data, 157, PublicKey.default);
  writeKey(data, 189, key(4));
  writeU128(data, 221, 1_050_000_000n);
  writeU128(data, 237, 0n);
  writeU128(data, 253, 0n);
  return data;
}

function levelFixture() {
  const data = Buffer.alloc(PANTA_PRICE_LEVEL_SIZE);
  PANTA_PRICE_LEVEL_DISCRIMINATOR.copy(data);
  data[8] = 1;
  writeKey(data, 9, key(2));
  data.writeBigUInt64LE(420_000_000n, 41);
  data[49] = 253;
  data.writeBigUInt64LE(2_500_000_000n, 50);
  data.writeBigUInt64LE(0n, 58);
  data.writeBigUInt64LE(1n, 66);
  data.writeBigUInt64LE(0n, 74);
  data.writeBigUInt64LE(8n, 82);
  writeKey(data, 90, key(5));
  writeKey(data, 122, key(5));
  writeKey(data, 154, PublicKey.default);
  writeKey(data, 186, PublicKey.default);
  return data;
}

describe("Panta order-book account decoding", () => {
  it("decodes the current 269-byte OrderNode layout", () => {
    const order = decodeOrderNode(orderFixture());

    expect(order).toMatchObject({
      isInitialized: true,
      owner: key(1).toBase58(),
      event: key(2).toBase58(),
      priceLevel: key(3).toBase58(),
      amount: 2_500_000_000n,
      originalAmount: 4_000_000_000n,
      timestamp: 1_700_000_000n,
      side: "yes",
      orderType: "bid",
      orderIntent: "buy",
      priceLamports: 420_000_000n,
      orderId: 7n,
      clientNonce: 99n,
      lockedLamports: 1_050_000_000n,
    });
    expect(isLiveOrderNode(order)).toBe(true);
  });

  it("decodes PriceLevel aggregates and linked-list heads", () => {
    const level = decodePriceLevel(levelFixture());

    expect(level).toMatchObject({
      isInitialized: true,
      event: key(2).toBase58(),
      priceLamports: 420_000_000n,
      totalBidAmount: 2_500_000_000n,
      bidCount: 1n,
      nextOrderId: 8n,
      bidHead: key(5).toBase58(),
    });
    expect(isActivePriceLevel(level)).toBe(true);
  });

  it("maps maker intent to the inverse executable taker action", () => {
    const order = decodeOrderNode(orderFixture());
    const opportunity = normalizeOrderNode(
      { pubkey: key(6).toBase58(), ...order },
      "SOL",
      9,
    );

    expect(opportunity).toMatchObject({
      action: "sell",
      outcome: "yes",
      price: "0.42",
      remainingShares: "2.5",
      totalQuoteValue: "1.05",
      makerIntent: "buy",
      makerOrderType: "bid",
    });
  });

  it("excludes zero-remaining nodes and orders best execution by action", () => {
    const inactive = orderFixture();
    inactive.writeBigUInt64LE(0n, 105);
    expect(isLiveOrderNode(decodeOrderNode(inactive))).toBe(false);

    const base = normalizeOrderNode(
      { pubkey: key(6).toBase58(), ...decodeOrderNode(orderFixture()) },
      "SOL",
      9,
    );
    expect(
      sortExecutableOpportunities([
        { ...base, price: "0.2" },
        { ...base, price: "0.7" },
      ]).map((row) => row.price),
    ).toEqual(["0.7", "0.2"]);
    expect(
      sortExecutableOpportunities([
        { ...base, action: "buy", price: "0.7" },
        { ...base, action: "buy", price: "0.2" },
      ]).map((row) => row.price),
    ).toEqual(["0.2", "0.7"]);
  });

  it("keeps base-unit formatting exact and rejects a wrong discriminator", () => {
    expect(formatBaseUnits(100_000_001n, 9)).toBe("0.100000001");
    const invalid = orderFixture();
    invalid[0] ^= 1;
    expect(() => decodeOrderNode(invalid)).toThrow(/discriminator/);
  });
});

