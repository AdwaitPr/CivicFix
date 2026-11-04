import { NextRequest, NextResponse } from "next/server";
import { getCivicFixRepository } from "@/lib/repository";
import { AdminStatusTransitionSchema } from "@/lib/validation/civicfix-schemas";
import type { UserRole } from "@/lib/domain/types";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: reportId } = await context.params;
  const actorRole = (request.headers.get("x-user-role") ?? "admin") as UserRole;
  const actorId = request.headers.get("x-user-id") ?? "system-admin-uuid";

  if (actorRole !== "admin") {
    return NextResponse.json(
      { error: "Forbidden: Only authorized administrators can transition report statuses." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON payload." }, { status: 400 });
  }

  const parsed = AdminStatusTransitionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid status transition payload.", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const repo = await getCivicFixRepository();
    const updated = await repo.transitionReportStatus({
      reportId,
      newStatus: parsed.data.newStatus,
      actorId,
      actorRole,
      publicRationale: parsed.data.publicRationale,
      internalAdminNote: parsed.data.internalAdminNote,
      canonicalReportId: parsed.data.canonicalReportId,
    });

    return NextResponse.json({
      message: `Report ${updated.reference_code} status transitioned to ${updated.status}.`,
      previousStatus: parsed.data.newStatus,
      newStatus: updated.status,
      report: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update report status." },
      { status: 400 }
    );
  }
}
