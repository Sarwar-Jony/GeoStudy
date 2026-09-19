import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { Pool } from "pg";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const databaseUrl = process.env.DATABASE_URL;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaPgLiteClient?: PGlite;
  __arenaDb?: any;
};

function initPglite() {
  const dataDir = path.join(process.cwd(), ".pgdata");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Remove stale postmaster.pid lock file if present from a crashed process
  const pidFile = path.join(dataDir, "postmaster.pid");
  if (fs.existsSync(pidFile)) {
    try {
      fs.unlinkSync(pidFile);
    } catch {}
  }

  // If existing client in globalThis is dead/closed, clear it
  if (globalForDb.__arenaPgLiteClient) {
    const existing = globalForDb.__arenaPgLiteClient;
    if (existing.closed) {
      globalForDb.__arenaPgLiteClient = undefined;
      globalForDb.__arenaDb = undefined;
    }
  }

  if (globalForDb.__arenaPgLiteClient && globalForDb.__arenaDb) {
    return { client: globalForDb.__arenaPgLiteClient, db: globalForDb.__arenaDb };
  }

  let client: PGlite;
  try {
    client = new PGlite(dataDir);
  } catch {
    // If the data directory was corrupted, clean and re-instantiate
    try {
      fs.rmSync(dataDir, { recursive: true, force: true });
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {}
    client = new PGlite(dataDir);
  }

  // Only run migration once the client has completed WASM readiness
  const migrationPath = path.join(process.cwd(), "drizzle", "0000_fuzzy_saracen.sql");
  client.waitReady
    .then(async () => {
      if (fs.existsSync(migrationPath)) {
        const sqlContent = fs.readFileSync(migrationPath, "utf-8");
        await client.exec(sqlContent).catch(() => {
          // Tables already exist
        });
      }
    })
    .catch((err) => {
      console.warn("PGlite initialization error:", err);
      // Reset global on abort so next invocation can heal
      globalForDb.__arenaPgLiteClient = undefined;
      globalForDb.__arenaDb = undefined;
    });

  const dbInstance = drizzlePglite(client, { schema });

  globalForDb.__arenaPgLiteClient = client;
  globalForDb.__arenaDb = dbInstance;
  return { client, db: dbInstance };
}

let dbExport: any;
let poolExport: Pool | undefined;

if (databaseUrl && (databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://"))) {
  poolExport =
    globalForDb.__arenaNextJsPostgresqlPool ??
    new Pool({
      connectionString: databaseUrl,
    });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsPostgresqlPool = poolExport;
  }
  dbExport = drizzleNodePg(poolExport, { schema });
} else {
  // Use dynamic proxy so if PGlite needs to self-heal or restart, db operations remain seamless
  const proxyTarget = {
    get current() {
      const { db } = initPglite();
      return db;
    },
  };

  dbExport = new Proxy(proxyTarget, {
    get(target, prop) {
      const currentDb = target.current;
      const val = currentDb[prop];
      if (typeof val === "function") {
        return (...args: any[]) => {
          try {
            const res = val.apply(currentDb, args);
            if (res && typeof res.catch === "function") {
              return res.catch((err: any) => {
                if (String(err?.message || err).includes("Aborted()") || String(err?.cause).includes("Aborted()")) {
                  console.warn("Detected aborted PGlite instance, resetting client...");
                  globalForDb.__arenaPgLiteClient = undefined;
                  globalForDb.__arenaDb = undefined;
                }
                throw err;
              });
            }
            return res;
          } catch (err: any) {
            if (String(err?.message || err).includes("Aborted()") || String(err?.cause).includes("Aborted()")) {
              console.warn("Detected aborted PGlite instance, resetting client...");
              globalForDb.__arenaPgLiteClient = undefined;
              globalForDb.__arenaDb = undefined;
            }
            throw err;
          }
        };
      }
      return val;
    },
  });
}

export const pool = poolExport;
export const db = dbExport;
