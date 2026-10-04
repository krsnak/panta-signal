import { describe, expect, it } from "vitest";
import {
  errorMessageFromBody,
  fromSixDecimalBaseUnits,
  hasValidProbabilityPair,
  hasUsefulDetail,
  isRelevantMarket,
  normalizeMarket,
  normalizeStatus,
  toNumber,
} from "./panta-core";

describe("Panta normalization", () => {
  it("normalizes documented prices and metadata", () => {
    const market = normalizeMarket({
      marketId: "abc123",
      title: "Will X happen?",
      description: "Resolution text",
      category: "crypto",
      phase: "primary",
      status: "open",
      volumeUsdc: "245.70",
      primaryYesPrice: "0.5205",
      primaryNoPrice: "0.4795",
      images: ["https://example.com/market.png"],
    });

    expect(market).toMatchObject({
      id: "abc123",
      title: "Will X happen?",
      yesProbability: 0.5205,
      noProbability: 0.4795,
      volumeUsdc: 245.7,
      imageUrl: "https://example.com/market.png",
    });
  });

  it("keeps catalog metadata when detail is incomplete", () => {
    const market = normalizeMarket(
      {
        marketId: "market-1",
        phase: "secondary",
        status: "secondary_active",
      },
      {
        marketId: "market-1",
        title: "Catalog title",
        description: "Catalog description",
        category: "sports",
        phase: "secondary",
        volumeUsdc: "388.63",
        images: ["https://example.com/sports.png"],
      },
    );

    expect(market.title).toBe("Catalog title");
    expect(market.description).toBe("Catalog description");
    expect(market.category).toBe("sports");
    expect(market.status).toBe("secondary");
    expect(market.volumeUsdc).toBe(388.63);
    expect(market.yesProbability).toBeNull();
    expect(market.noProbability).toBeNull();
  });

  it("does not invent a live price when Panta returns null prices", () => {
    const market = normalizeMarket({
      marketId: "market-2",
      title: "Initial market",
      phase: "primary",
      volumeUsdc: "0",
      yesPrice: null,
      noPrice: null,
    });

    expect(market.yesProbability).toBeNull();
    expect(market.noProbability).toBeNull();
  });

  it("preserves final resolved 100/0 outcome", () => {
    const market = normalizeMarket({
      marketId: "resolved-1",
      title: "Resolved market",
      phase: "resolved",
      yesPrice: "1",
      noPrice: "0",
      volumeUsdc: "921.02",
    });

    expect(market.yesProbability).toBe(1);
    expect(market.noProbability).toBe(0);
    expect(market.phase).toBe("resolved");
  });

  it("does not present non-complementary spot prices as probabilities", () => {
    const market = normalizeMarket({
      marketId: "sol-quoted-secondary",
      title: "SOL quoted market",
      phase: "secondary",
      status: "secondary_active",
      secondaryYesPrice: "0.5684",
      secondaryNoPrice: "0.8000",
      volumeUsdc: "12096.08",
    });

    expect(market.yesProbability).toBeNull();
    expect(market.noProbability).toBeNull();
  });

  it("marks incomplete identity with an explicit technical fallback", () => {
    const market = normalizeMarket({ marketId: "DW1G3gChLongId" });
    expect(market.title).toBe("Market DW1G3gCh…");
  });

  it("recognizes useful detail from either price or traded volume", () => {
    expect(
      hasUsefulDetail({
        marketId: "price",
        title: "Price market",
        yesPrice: "0.51",
      }),
    ).toBe(true);

    expect(
      hasUsefulDetail({
        marketId: "volume",
        title: "Volume market",
        volumeUsdc: "10",
      }),
    ).toBe(true);

    expect(
      hasUsefulDetail({
        marketId: "empty",
        title: "Metadata only",
        volumeUsdc: "0",
      }),
    ).toBe(false);
  });
});

describe("Panta helper behavior", () => {
  it("maps secondary_active to secondary", () => {
    expect(normalizeStatus("secondary_active", "secondary")).toBe("secondary");
  });

  it("parses finite numeric strings only", () => {
    expect(toNumber("0.52")).toBe(0.52);
    expect(toNumber("")).toBeNull();
    expect(toNumber("not-a-number")).toBeNull();
  });

  it("normalizes six-decimal catalog base units", () => {
    expect(fromSixDecimalBaseUnits("1933475")).toBe(1.933475);
    expect(fromSixDecimalBaseUnits(50000)).toBe(0.05);
    expect(fromSixDecimalBaseUnits(null)).toBeNull();
  });

  it("quality-gates probability pairs and judge-facing markets", () => {
    expect(hasValidProbabilityPair(0.506, 0.494)).toBe(true);
    expect(hasValidProbabilityPair(0.568, 0.8)).toBe(false);

    expect(
      isRelevantMarket({
        id: "live",
        title: "Will this happen?",
        description: "",
        category: "world",
        phase: "secondary",
        status: "secondary",
        yesProbability: 0.52,
        noProbability: 0.48,
        volumeUsdc: 10,
        imageUrl: null,
      }),
    ).toBe(true);

    expect(
      isRelevantMarket({
        id: "cancelled",
        title: "Cancelled market",
        description: "",
        category: "world",
        phase: "secondary",
        status: "CANCELLED",
        yesProbability: 0.52,
        noProbability: 0.48,
        volumeUsdc: 10,
        imageUrl: null,
      }),
    ).toBe(false);
  });

  it("extracts structured error messages without assuming one envelope", () => {
    expect(errorMessageFromBody({ message: "temporarily unavailable" })).toBe(
      "temporarily unavailable",
    );
    expect(errorMessageFromBody({ detail: "bad request" })).toBe("bad request");
    expect(errorMessageFromBody({ fields: { wallet: "invalid" } })).toBe(
      '{"wallet":"invalid"}',
    );
    expect(errorMessageFromBody("<html>cloudflare</html>")).toBe("");
  });
});
