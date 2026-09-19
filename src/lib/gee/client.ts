import ee from "@google/earthengine";
import fs from "fs";
import path from "path";

export interface GeeStatus {
  isConfigured: boolean;
  isConnected: boolean;
  project?: string;
  email?: string;
  error?: string | null;
}

let initPromise: Promise<boolean> | null = null;
let isConnected = false;
let lastError: string | null = null;
let activeProject: string | undefined = undefined;
let activeEmail: string | undefined = undefined;

export function getGeeCredentials(): { client_email: string; private_key: string; project_id?: string } | null {
  // 1. Direct JSON string from environment
  if (process.env.GEE_KEY_JSON) {
    try {
      const parsed = JSON.parse(process.env.GEE_KEY_JSON);
      if (parsed.client_email && parsed.private_key) return parsed;
    } catch {}
  }

  // 2. Discrete environment variables
  if (process.env.GEE_SERVICE_ACCOUNT_EMAIL && process.env.GEE_PRIVATE_KEY) {
    return {
      client_email: process.env.GEE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GEE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      project_id: process.env.GEE_PROJECT_ID,
    };
  }

  // 3. Local file credentials
  const defaultKeyPath = process.env.GEE_KEY_FILE || path.join(/*turbopackIgnore: true*/ process.cwd(), "gee-credentials.json");
  if (fs.existsSync(defaultKeyPath)) {
    try {
      const content = fs.readFileSync(defaultKeyPath, "utf8");
      const parsed = JSON.parse(content);
      if (parsed.client_email && parsed.private_key) return parsed;
    } catch {}
  }

  return null;
}

export function isGeeConfigured(): boolean {
  return getGeeCredentials() !== null;
}

export function isGeeReady(): boolean {
  return isConnected;
}

export function getGeeStatus(): GeeStatus {
  const creds = getGeeCredentials();
  return {
    isConfigured: Boolean(creds),
    isConnected,
    project: activeProject || creds?.project_id,
    email: activeEmail || creds?.client_email,
    error: lastError,
  };
}

export async function initGee(force = false): Promise<boolean> {
  if (isConnected && !force) return true;
  if (initPromise && !force) return initPromise;

  initPromise = new Promise<boolean>((resolve) => {
    const creds = getGeeCredentials();
    if (!creds) {
      isConnected = false;
      lastError = "Google Earth Engine service account credentials not configured";
      resolve(false);
      return;
    }

    const projectId = creds.project_id || process.env.GEE_PROJECT_ID || undefined;

    ee.data.authenticateViaPrivateKey(
      creds,
      () => {
        ee.initialize(
          null,
          null,
          () => {
            isConnected = true;
            lastError = null;
            activeProject = projectId;
            activeEmail = creds.client_email;
            resolve(true);
          },
          (err: any) => {
            isConnected = false;
            lastError = String(err?.message || err);
            resolve(false);
          },
          null,
          projectId,
        );
      },
      (err: any) => {
        isConnected = false;
        lastError = String(err?.message || err);
        resolve(false);
      },
    );
  });

  const result = await initPromise;
  if (!result) {
    initPromise = null; // Clear so subsequent calls can retry with updated credentials
  }
  return result;
}

export { ee };
