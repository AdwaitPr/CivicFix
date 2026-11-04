import { NextRequest, NextResponse } from "next/server";
import { getCivicFixRepository } from "@/lib/repository";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ ref: string }> }
) {
  const { ref } = await context.params;

  try {
    const repo = await getCivicFixRepository();
    let reportDetail = await repo.getReportByReference(ref);

    if (!reportDetail) {
      // Fallback check by UUID
      const report = await repo.getReportById(ref);
      if (report) {
        reportDetail = await repo.getReportByReference(report.reference_code);
      }
    }

    if (!reportDetail) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    return NextResponse.json({
      disclaimer:
        "CivicFix is an independent civic tracking registry. Reports are not automatically transmitted to government authorities.",
      report: reportDetail,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to retrieve report." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ ref: string }> }
) {
  const { ref: reportId } = await context.params;
  const actorId = request.headers.get("x-user-id") ?? "anonymous";
  const actorRole = request.headers.get("x-user-role") ?? "citizen";
  const isAdmin = actorRole === "admin";

  try {
    const repo = await getCivicFixRepository();
    const success = await repo.deleteSubmittedReport(reportId, actorId, isAdmin);
    if (!success) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }
    return NextResponse.json({ message: "Report successfully removed." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete report." }, { status: 403 });
  }
}
