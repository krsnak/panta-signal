import { NextRequest, NextResponse } from "next/server";
import { quoteMarketCreate } from "@/lib/panta";
import {
  bootstrapAuthorized,
  bootstrapEnabled,
} from "@/lib/bootstrap-auth";
import {
  isPantaCategory,
  isPublicHttpUrl,
  isSolanaPublicKey,
  isUnixSecond,
} from "@/lib/validation";

export async function POST(request: NextRequest) {
  if (!bootstrapEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!bootstrapAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json() as {
      wallet?: string;
      question?: string;
      resolutionRule?: string;
      sourcesOfTruth?: string[];
      category?: string;
      startTime?: number;
      endTime?: number;
      resolutionTime?: number;
      imageUrl?: string;
      title?: string;
      description?: string;
      region?: string;
    };

    if (!body.wallet || !body.question || !body.resolutionRule || !body.imageUrl) {
      return NextResponse.json({ error: "Missing required create-market fields" }, { status: 400 });
    }
    if (!isSolanaPublicKey(body.wallet)) {
      return NextResponse.json({ error: "Invalid Solana wallet address" }, { status: 400 });
    }
    if (body.question.length > 512 || body.question.trim().length < 3) {
      return NextResponse.json({ error: "question must be between 3 and 512 characters" }, { status: 400 });
    }
    if (body.resolutionRule.length > 2048 || body.resolutionRule.trim().length < 3) {
      return NextResponse.json({ error: "resolutionRule must be between 3 and 2048 characters" }, { status: 400 });
    }
    if (!Array.isArray(body.sourcesOfTruth) || body.sourcesOfTruth.length === 0) {
      return NextResponse.json({ error: "At least one source of truth is required" }, { status: 400 });
    }
    if (body.sourcesOfTruth.length > 20 || !body.sourcesOfTruth.every(isPublicHttpUrl)) {
      return NextResponse.json({ error: "sourcesOfTruth must contain 1–20 public http(s) URLs" }, { status: 400 });
    }
    const category = body.category || "crypto";
    if (!isPantaCategory(category)) {
      return NextResponse.json({ error: "Invalid Panta category" }, { status: 400 });
    }
    if (!isPublicHttpUrl(body.imageUrl)) {
      return NextResponse.json({ error: "imageUrl must be a public http(s) URL" }, { status: 400 });
    }
    if (!isUnixSecond(body.startTime) || !isUnixSecond(body.endTime) || !isUnixSecond(body.resolutionTime)) {
      return NextResponse.json({ error: "Market times are required" }, { status: 400 });
    }
    if (!(body.startTime < body.endTime && body.endTime <= body.resolutionTime)) {
      return NextResponse.json({ error: "Market times must satisfy startTime < endTime <= resolutionTime" }, { status: 400 });
    }

    const quote = await quoteMarketCreate({
      wallet: body.wallet,
      question: body.question,
      resolutionRule: body.resolutionRule,
      sourcesOfTruth: body.sourcesOfTruth,
      category,
      startTime: body.startTime,
      endTime: body.endTime,
      resolutionTime: body.resolutionTime,
      imageUrl: body.imageUrl,
      marketType: "standard",
      title: body.title || body.question,
      description: body.description || "",
      region: body.region || "Global",
    });
    return NextResponse.json(quote, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Create quote failed" },
      { status: 502 },
    );
  }
}
