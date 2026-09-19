import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { comparePassword, signSession, AUTH_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = (body?.email || "").trim().toLowerCase();
  const password = (body?.password || "").toString();

  if (!email || !password) {
    return Response.json({ error: "Email and password required." }, { status: 400 });
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    return Response.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = signSession({ userId: user.id, email: user.email, name: user.name });
  const store = await cookies();
  store.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return Response.json({ user: { id: user.id, email: user.email, name: user.name } });
}
