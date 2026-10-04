import { PublicKey } from "@solana/web3.js";

export const PANTA_ORDER_NODE_DISCRIMINATOR = Buffer.from([
  220, 235, 38, 63, 66, 140, 138, 244,
]);
export const PANTA_PRICE_LEVEL_DISCRIMINATOR = Buffer.from([
  236, 106, 90, 162, 188, 41, 219, 186,
]);

export const PANTA_ORDER_NODE_SIZE = 269;
export const PANTA_PRICE_LEVEL_SIZE = 218;
export const PANTA_ORDER_NODE_EVENT_OFFSET = 41;
export const PANTA_PRICE_LEVEL_EVENT_OFFSET = 9;

export type PantaOutcome = "yes" | "no";
export type PantaTakerAction = "buy" | "sell";

export type DecodedOrderNode = {
  isInitialized: boolean;
  owner: string;
  event: string;
  priceLevel: string;
  amount: bigint;
  originalAmount: bigint;
  timestamp: bigint;
  side: PantaOutcome;
  orderType: "bid" | "ask";
  orderIntent: "buy" | "sell";
  priceLamports: bigint;
  bump: number;
  orderId: bigint;
  clientNonce: bigint;
  previousOrder: string;
  nextOrder: string;
  lockedLamports: bigint;
  lockedYesShares: bigint;
  lockedNoShares: bigint;
};

export type DecodedPriceLevel = {
  isInitialized: boolean;
  event: string;
  priceLamports: bigint;
  bump: number;
  totalBidAmount: bigint;
  totalAskAmount: bigint;
  bidCount: bigint;
  askCount: bigint;
  nextOrderId: bigint;
  bidHead: string;
  bidTail: string;
  askHead: string;
  askTail: string;
};

export type PantaOrderAccount = DecodedOrderNode & { pubkey: string };

export type PantaOpportunity = {
  action: PantaTakerAction;
  outcome: PantaOutcome;
  price: string;
  remainingShares: string;
  totalQuoteValue: string;
  quoteAsset: string;
  orderPubkey: string;
  maker: string;
  makerIntent: "buy" | "sell";
  makerOrderType: "bid" | "ask";
  priceLevelPubkey: string;
  orderId: string;
  timestamp: number | null;
};

function assertAccount(
  data: Buffer,
  expectedSize: number,
  discriminator: Buffer,
  label: string,
) {
  if (data.length !== expectedSize) {
    throw new Error(`${label} has ${data.length} bytes; expected ${expectedSize}`);
  }
  if (!data.subarray(0, 8).equals(discriminator)) {
    throw new Error(`${label} discriminator does not match the current Panta IDL`);
  }
}

function publicKeyAt(data: Buffer, offset: number) {
  return new PublicKey(data.subarray(offset, offset + 32)).toBase58();
}

function u128At(data: Buffer, offset: number) {
  return data.readBigUInt64LE(offset) + (data.readBigUInt64LE(offset + 8) << 64n);
}

function enumValue<T extends string>(
  value: number,
  variants: readonly T[],
  label: string,
): T {
  const decoded = variants[value];
  if (!decoded) throw new Error(`Unknown ${label} enum variant ${value}`);
  return decoded;
}

export function decodeOrderNode(data: Buffer): DecodedOrderNode {
  assertAccount(
    data,
    PANTA_ORDER_NODE_SIZE,
    PANTA_ORDER_NODE_DISCRIMINATOR,
    "OrderNode",
  );

  return {
    isInitialized: data[8] === 1,
    owner: publicKeyAt(data, 9),
    event: publicKeyAt(data, 41),
    priceLevel: publicKeyAt(data, 73),
    amount: data.readBigUInt64LE(105),
    originalAmount: data.readBigUInt64LE(113),
    timestamp: data.readBigInt64LE(121),
    side: enumValue(data[129], ["yes", "no"] as const, "OrderSide"),
    orderType: enumValue(data[130], ["bid", "ask"] as const, "OrderType"),
    orderIntent: enumValue(data[131], ["buy", "sell"] as const, "OrderIntent"),
    priceLamports: data.readBigUInt64LE(132),
    bump: data[140],
    orderId: data.readBigUInt64LE(141),
    clientNonce: data.readBigUInt64LE(149),
    previousOrder: publicKeyAt(data, 157),
    nextOrder: publicKeyAt(data, 189),
    lockedLamports: u128At(data, 221),
    lockedYesShares: u128At(data, 237),
    lockedNoShares: u128At(data, 253),
  };
}

export function decodePriceLevel(data: Buffer): DecodedPriceLevel {
  assertAccount(
    data,
    PANTA_PRICE_LEVEL_SIZE,
    PANTA_PRICE_LEVEL_DISCRIMINATOR,
    "PriceLevel",
  );

  return {
    isInitialized: data[8] === 1,
    event: publicKeyAt(data, 9),
    priceLamports: data.readBigUInt64LE(41),
    bump: data[49],
    totalBidAmount: data.readBigUInt64LE(50),
    totalAskAmount: data.readBigUInt64LE(58),
    bidCount: data.readBigUInt64LE(66),
    askCount: data.readBigUInt64LE(74),
    nextOrderId: data.readBigUInt64LE(82),
    bidHead: publicKeyAt(data, 90),
    bidTail: publicKeyAt(data, 122),
    askHead: publicKeyAt(data, 154),
    askTail: publicKeyAt(data, 186),
  };
}

export function isLiveOrderNode(order: DecodedOrderNode) {
  return order.isInitialized && order.amount > 0n && order.priceLamports > 0n;
}

export function isActivePriceLevel(level: DecodedPriceLevel) {
  return (
    level.isInitialized &&
    (level.bidCount > 0n ||
      level.askCount > 0n ||
      level.totalBidAmount > 0n ||
      level.totalAskAmount > 0n)
  );
}

export function formatBaseUnits(value: bigint, decimals: number) {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const scale = 10n ** BigInt(decimals);
  const whole = absolute / scale;
  const fraction = (absolute % scale).toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

export function normalizeOrderNode(
  order: PantaOrderAccount,
  quoteAsset: string,
  shareDecimals: number,
): PantaOpportunity {
  if (!isLiveOrderNode(order)) throw new Error("Cannot normalize an inactive OrderNode");

  // OrderIntent describes the maker. The executable opportunity shown to a
  // taker is its inverse: a maker BUY is a taker SELL opportunity, and vice versa.
  const action: PantaTakerAction = order.orderIntent === "buy" ? "sell" : "buy";
  return {
    action,
    outcome: order.side,
    price: formatBaseUnits(order.priceLamports, 9),
    remainingShares: formatBaseUnits(order.amount, shareDecimals),
    totalQuoteValue: formatBaseUnits(
      order.amount * order.priceLamports,
      shareDecimals + 9,
    ),
    quoteAsset,
    orderPubkey: order.pubkey,
    maker: order.owner,
    makerIntent: order.orderIntent,
    makerOrderType: order.orderType,
    priceLevelPubkey: order.priceLevel,
    orderId: order.orderId.toString(),
    timestamp:
      order.timestamp >= 0n && order.timestamp <= BigInt(Number.MAX_SAFE_INTEGER)
        ? Number(order.timestamp)
        : null,
  };
}

function compareDecimalStrings(left: string, right: string) {
  const [leftWhole, leftFraction = ""] = left.split(".");
  const [rightWhole, rightFraction = ""] = right.split(".");
  if (leftWhole.length !== rightWhole.length) return leftWhole.length - rightWhole.length;
  if (leftWhole !== rightWhole) return leftWhole < rightWhole ? -1 : 1;
  const width = Math.max(leftFraction.length, rightFraction.length);
  return leftFraction.padEnd(width, "0").localeCompare(rightFraction.padEnd(width, "0"));
}

export function sortExecutableOpportunities(opportunities: PantaOpportunity[]) {
  return [...opportunities].sort((left, right) => {
    const priceOrder = compareDecimalStrings(left.price, right.price);
    if (priceOrder !== 0) {
      return left.action === "buy" ? priceOrder : -priceOrder;
    }
    return (left.timestamp ?? 0) - (right.timestamp ?? 0);
  });
}

