import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import ee from "@google/earthengine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let creds: { client_email?: string; private_key?: string; project_id?: string } = {};

    if (body.jsonKey) {
      creds = typeof body.jsonKey === "string" ? JSON.parse(body.jsonKey) : body.jsonKey;
    } else if (body.email && body.privateKey) {
      creds = {
        client_email: body.email,
        private_key: body.privateKey.replace(/\\n/g, "\n"),
        project_id: body.projectId,
      };
    }

    if (!creds.client_email || !creds.private_key) {
      return Response.json(
        { error: "Invalid credentials: client_email and private_key are required." },
        { status: 400 },
      );
    }

    // Verify authentication against Google Earth Engine
    await new Promise<void>((resolve, reject) => {
      ee.data.authenticateViaPrivateKey(
        creds,
        () => {
          ee.initialize(
            null,
            null,
            () => resolve(),
            (err: any) => reject(new Error(String(err?.message || err))),
            null,
            creds.project_id,
          );
        },
        (err: any) => reject(new Error(String(err?.message || err))),
      );
    });

    // Save to local credentials file for persistent use
    const credsPath = path.join(process.cwd(), "gee-credentials.json");
    fs.writeFileSync(credsPath, JSON.stringify(creds, null, 2), "utf8");

    return Response.json({
      ok: true,
      message: "Google Earth Engine service account verified and saved successfully.",
      email: creds.client_email,
      project: creds.project_id,
    });
  } catch (err) {
    return Response.json(
      { error: (err as Error).message || "Failed to authenticate with Google Earth Engine." },
      { status: 400 },
    );
  }
}
