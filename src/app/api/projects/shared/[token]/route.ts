import { NextRequest } from "next/server";
import { db } from "@/db";
import { projects, generatedLayers } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const [project] = await db.select().from(projects).where(eq(projects.shareToken, token)).limit(1);
  if (!project) return Response.json({ error: "Shared project not found" }, { status: 404 });

  const layers = await db.select().from(generatedLayers).where(eq(generatedLayers.projectId, project.id));
  return Response.json({ project, layers });
}
