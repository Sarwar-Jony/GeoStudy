import { NextRequest } from "next/server";
import { db } from "@/db";
import { projects, generatedLayers, jobs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession, getOrCreateOwnerToken } from "@/lib/auth";
import { canAccessProject } from "@/lib/projectAccess";
import { deleteProjectDir } from "@/lib/storage";
import { LAYER_CATALOG } from "@/lib/raster/layerCatalog";

export const dynamic = "force-dynamic";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadProject(id: string) {
  if (!id || !UUID_REGEX.test(id)) return null;
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return project ?? null;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await loadProject(id);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const session = await getSession();
  const ownerToken = await getOrCreateOwnerToken();
  const isOwner = canAccessProject(project, session, ownerToken);

  const layers = await db
    .select()
    .from(generatedLayers)
    .where(eq(generatedLayers.projectId, id))
    .orderBy(generatedLayers.category);
  const jobRows = await db.select().from(jobs).where(eq(jobs.projectId, id)).orderBy(desc(jobs.createdAt)).limit(1);

  return Response.json({ project, layers, job: jobRows[0] ?? null, catalog: LAYER_CATALOG, isOwner });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await loadProject(id);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const session = await getSession();
  const ownerToken = await getOrCreateOwnerToken();
  if (!canAccessProject(project, session, ownerToken)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const update: Partial<typeof projects.$inferInsert> = { updatedAt: new Date() };
  if (typeof body.name === "string") update.name = body.name;
  if (Array.isArray(body.selectedLayers)) update.selectedLayers = body.selectedLayers;
  if (typeof body.resolution === "number") update.resolution = body.resolution;
  if (typeof body.status === "string") update.status = body.status;

  const [updated] = await db.update(projects).set(update).where(eq(projects.id, id)).returning();
  return Response.json({ project: updated });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await loadProject(id);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const session = await getSession();
  const ownerToken = await getOrCreateOwnerToken();
  if (!canAccessProject(project, session, ownerToken)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(generatedLayers).where(eq(generatedLayers.projectId, id));
  await db.delete(jobs).where(eq(jobs.projectId, id));
  await db.delete(projects).where(eq(projects.id, id));
  deleteProjectDir(id);

  return Response.json({ ok: true });
}
