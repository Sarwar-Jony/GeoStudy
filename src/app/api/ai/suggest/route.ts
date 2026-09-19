import { NextRequest } from "next/server";
import { getAiSuggestion } from "@/lib/aiSuggest";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const goal = (body?.goal || "").toString().slice(0, 300);
  const suggestion = await getAiSuggestion(goal);
  return Response.json(suggestion);
}
