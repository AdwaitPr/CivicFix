import { NextRequest, NextResponse } from "next/server";
import { getCivicFixRepository } from "@/lib/repository";
import { z } from "zod";

const DuplicateCheckSchema = z.object({
  categoryId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  title: z.string().min(1),
  description: z.string().min(1),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON payload." }, { status: 400 });
  }

  const parsed = DuplicateCheckSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const repo = await getCivicFixRepository();
    const candidates = await repo.previewDuplicates(parsed.data);
    return NextResponse.json({ candidates });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to check duplicates." },
      { status: 500 }
    );
  }
}
