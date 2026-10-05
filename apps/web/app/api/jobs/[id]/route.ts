import { NextResponse } from "next/server";
import { getJobStatus } from "@/lib/jobstatus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await getJobStatus((await params).id);
  return NextResponse.json(r.body, { status: r.http });
}
