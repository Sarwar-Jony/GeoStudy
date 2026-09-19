import { NextRequest } from "next/server";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;

      const sendUpdate = async () => {
        if (isClosed) return false;
        try {
          const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
          if (!job) {
            controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: "Job not found" })}\n\n`));
            controller.close();
            isClosed = true;
            return false;
          }

          controller.enqueue(encoder.encode(`event: progress\ndata: ${JSON.stringify({ job })}\n\n`));

          if (job.status === "completed" || job.status === "failed") {
            controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({ job })}\n\n`));
            controller.close();
            isClosed = true;
            return false;
          }
          return true;
        } catch (err) {
          if (!isClosed) {
            controller.close();
            isClosed = true;
          }
          return false;
        }
      };

      const keepGoing = await sendUpdate();
      if (!keepGoing) return;

      const interval = setInterval(async () => {
        const continuePolling = await sendUpdate();
        if (!continuePolling) {
          clearInterval(interval);
        }
      }, 750);

      _req.signal.addEventListener("abort", () => {
        isClosed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
