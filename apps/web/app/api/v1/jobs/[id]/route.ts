import { NextResponse } from "next/server";
import { apiAuth, apiError } from "@/lib/apiauth";
import { db } from "@/lib/db";
import { getJobStatus } from "@/lib/jobstatus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/jobs/{id} — status; includes a short-lived `downloadUrl` when done. Only your own jobs. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await apiAuth(req);
  if ("res" in a) return a.res;
  const id = (await params).id;
  const row = await db.job.findUnique({ where: { id }, select: { userId: true } });
  if (!row || row.userId !== a.user.id) return apiError(404, "not_found", "Job not found.");
  const r = await getJobStatus(id), b = r.body as { status?: string };
  return NextResponse.json({ id, ...r.body }, { status: b.status === "expired" ? 410 : 200 });
}
