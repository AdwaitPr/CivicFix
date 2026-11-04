import { NextRequest, NextResponse } from "next/server";
import { getCivicFixRepository } from "@/lib/repository";

export async function GET(_request: NextRequest) {
  try {
    const repo = await getCivicFixRepository();
    const categories = await repo.getCategories();
    return NextResponse.json({ categories });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch categories." }, { status: 500 });
  }
}
