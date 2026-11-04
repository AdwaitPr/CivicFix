import { NextRequest, NextResponse } from "next/server";
import { getCivicFixRepository } from "@/lib/repository";
import { ModerationActionSchema } from "@/lib/validation/civicfix-schemas";
import type { UserRole } from "@/lib/domain/types";

export async function POST(request: NextRequest) {
  const actorRole = (request.headers.get("x-user-role") ?? "admin") as UserRole;
  const moderatorId = request.headers.get("x-user-id") ?? "mod-uuid-1";

  if (actorRole !== "admin" && actorRole !== "moderator") {
    return NextResponse.json(
      { error: "Forbidden: Only authorized moderators or admins can execute moderation actions." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON payload." }, { status: 400 });
  }

  const parsed = ModerationActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const repo = await getCivicFixRepository();
    await repo.recordModerationEvent({
      reportId: parsed.data.reportId,
      flagId: parsed.data.flagId,
      moderatorId,
      actionType: parsed.data.actionType,
      actionNotes: parsed.data.actionNotes,
      canonicalReportId: parsed.data.canonicalReportId,
    });

    return NextResponse.json({
      message: `Moderation action '${parsed.data.actionType}' recorded successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to record moderation action." },
      { status: 500 }
    );
  }
}
