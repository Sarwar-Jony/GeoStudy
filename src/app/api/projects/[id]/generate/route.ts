import { NextRequest } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession, getOrCreateOwnerToken } from "@/lib/auth";
import { canAccessProject } from "@/lib/projectAccess";
import { createAndRunJob } from "@/lib/jobRunner";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const session = await getSession();
  const ownerToken = await getOrCreateOwnerToken();
  if (!canAccessProject(project, session, ownerToken)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const update: Partial<typeof projects.$inferInsert> = {};
  if (Array.isArray(body.selectedLayers) && body.selectedLayers.length > 0) {
    update.selectedLayers = body.selectedLayers;
  }
  if (typeof body.resolution === "number") update.resolution = body.resolution;
  if (Object.keys(update).length > 0) {
    update.updatedAt = new Date();
    await db.update(projects).set(update).where(eq(projects.id, id));
  }

  const [current] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  const selectedLayers = (current.selectedLayers as string[]) ?? [];
  if (selectedLayers.length === 0) {
    return Response.json({ error: "Select at least one layer before generating." }, { status: 400 });
  }

  const jobId = await createAndRunJob(id);
  return Response.json({ jobId });
}
