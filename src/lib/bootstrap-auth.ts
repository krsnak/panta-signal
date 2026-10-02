import "server-only";

import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export function bootstrapEnabled() {
  return process.env.PANTA_MARKET_BOOTSTRAP_ENABLED === "true";
}

export function bootstrapAuthorized(request: NextRequest) {
  if (!bootstrapEnabled()) return false;
  const expected = process.env.PANTA_MARKET_BOOTSTRAP_SECRET?.trim();
  const provided = request.headers.get("x-bootstrap-secret")?.trim();
  if (!expected || !provided) return false;

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}
