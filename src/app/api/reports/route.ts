import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCivicFixRepository } from "@/lib/repository";
import {
  BoundingBoxQuerySchema,
  CreateReportSchema,
} from "@/lib/validation/civicfix-schemas";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = BoundingBoxQuerySchema.safeParse({
    west: searchParams.get("west") ?? -180,
    south: searchParams.get("south") ?? -90,
    east: searchParams.get("east") ?? 180,
    north: searchParams.get("north") ?? 90,
    categorySlug: searchParams.get("category") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    limit: searchParams.get("limit") ?? 250,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid spatial query parameters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const repo = await getCivicFixRepository();
    const reports = await repo.searchReportsInBBox(parsed.data);

    return NextResponse.json({
      disclaimer:
        "CivicFix is an independent civic tracking registry. Reports are not automatically transmitted to government authorities unless explicitly marked as Authority Onboarded.",
      count: reports.length,
      reports,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Geospatial search failed." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON request body." }, { status: 400 });
  }

  const parsed = CreateReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const forwardedFor = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const ipHash = crypto
    .createHash("sha256")
    .update(forwardedFor + (process.env.IP_HASH_SALT ?? "civicfix-salt"))
    .digest("hex");

  try {
    const repo = await getCivicFixRepository();
    const reporterId = request.headers.get("x-user-id") ?? undefined;
    const report = await repo.createReport(parsed.data, reporterId, ipHash);

    return NextResponse.json(
      {
        message: "Report recorded in the independent CivicFix registry.",
        report,
      },
      { status: 201 }
    );
  } catch (err: any) {
    const isRateLimit = err.message && err.message.includes("Rate limit exceeded");
    return NextResponse.json(
      { error: err.message || "Unable to store civic report." },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
