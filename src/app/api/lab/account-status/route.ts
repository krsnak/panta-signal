import { NextRequest, NextResponse } from "next/server";
import {
  bootstrapAuthorized,
  bootstrapEnabled,
} from "@/lib/bootstrap-auth";
import { getPantaAccountStatus } from "@/lib/panta";

export async function GET(request: NextRequest) {
  if (!bootstrapEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!bootstrapAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await getPantaAccountStatus(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to read Panta account status",
      },
      { status: 502 },
    );
  }
}
