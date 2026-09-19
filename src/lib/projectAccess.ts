import type { projects } from "@/db/schema";
import type { SessionPayload } from "./auth";

type Project = typeof projects.$inferSelect;

export function canAccessProject(project: Project, session: SessionPayload | null, ownerToken: string | null): boolean {
  if (session && project.userId === session.userId) return true;
  if (ownerToken && project.ownerToken === ownerToken) return true;
  return false;
}
