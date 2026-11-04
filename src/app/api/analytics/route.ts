import { NextRequest, NextResponse } from "next/server";
import { getCivicFixRepository } from "@/lib/repository";

export async function GET(_request: NextRequest) {
  try {
    const repo = await getCivicFixRepository();
    const analytics = await repo.getPublicAnalytics();
    return NextResponse.json(analytics);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to compute public analytics." },
      { status: 500 }
    );
  }
}
