import { NextRequest, NextResponse } from "next/server";
import { getCivicFixRepository } from "@/lib/repository";
import { CreateReportFlagSchema } from "@/lib/validation/civicfix-schemas";
import type { UserRole } from "@/lib/domain/types";

export async function GET(request: NextRequest) {
  const actorRole = (request.headers.get("x-user-role") ?? "admin") as UserRole;
  if (actorRole !== "admin" && actorRole !== "moderator") {
    return NextResponse.json({ error: "Forbidden: Staff only." }, { status: 403 });
  }

  try {
    const repo = await getCivicFixRepository();
    const flags = await repo.getPendingFlags();
    return NextResponse.json({ flags });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch pending flags." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON payload." }, { status: 400 });
  }

  const parsed = CreateReportFlagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const flaggedBy = request.headers.get("x-user-id") ?? undefined;

  try {
    const repo = await getCivicFixRepository();
    const flag = await repo.createFlag({
      reportId: parsed.data.reportId,
      matchedReportId: parsed.data.matchedReportId,
      flaggedBy,
      reason: parsed.data.reason,
      details: parsed.data.details,
    });

    return NextResponse.json(
      { message: "Report flagged for moderation review.", flag },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to flag report." },
      { status: 500 }
    );
  }
}
