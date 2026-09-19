import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  jsonb,
  timestamp,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Users (simple email/password auth, JWT session cookie)
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex("users_email_idx").on(table.email),
}));

// ---------------------------------------------------------------------------
// Cached administrative boundaries (fetched live from geoBoundaries / OSM and
// cached here with computed parent-child relationships + area/bbox/centroid)
// ---------------------------------------------------------------------------
export const boundaries = pgTable("boundaries", {
  id: uuid("id").defaultRandom().primaryKey(),
  countryIso3: text("country_iso3").notNull(),
  level: integer("level").notNull(), // 0 = country, 1..4 = admin sub-levels
  levelName: text("level_name").notNull(), // e.g. "Division", "District"
  externalId: text("external_id").notNull(), // upstream shapeID
  parentId: uuid("parent_id"),
  name: text("name").notNull(),
  geometry: jsonb("geometry").notNull(), // GeoJSON geometry
  bbox: jsonb("bbox").notNull(), // [minX,minY,maxX,maxY]
  areaKm2: numeric("area_km2", { precision: 14, scale: 3 }).notNull(),
  centroid: jsonb("centroid").notNull(), // [lng, lat]
  source: text("source").notNull().default("geoBoundaries"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqExternal: uniqueIndex("boundaries_country_level_external_idx").on(
    table.countryIso3,
    table.level,
    table.externalId,
  ),
  parentIdx: index("boundaries_parent_idx").on(table.parentId),
  countryLevelIdx: index("boundaries_country_level_idx").on(table.countryIso3, table.level),
}));

// ---------------------------------------------------------------------------
// Projects: a saved Study Area + selected layers/resolution configuration
// ---------------------------------------------------------------------------
export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id"),
  ownerToken: text("owner_token").notNull(), // anon-browser fallback owner key
  shareToken: text("share_token").notNull(),
  name: text("name").notNull(),
  countryIso3: text("country_iso3").notNull(),
  countryName: text("country_name").notNull(),
  level: integer("level").notNull(),
  levelName: text("level_name").notNull(),
  boundaryId: uuid("boundary_id"),
  boundaryName: text("boundary_name").notNull(),
  pathLabels: jsonb("path_labels").notNull().default([]),
  geometry: jsonb("geometry").notNull(),
  bbox: jsonb("bbox").notNull(),
  areaKm2: numeric("area_km2", { precision: 14, scale: 3 }).notNull(),
  resolution: integer("resolution").notNull().default(100),
  selectedLayers: jsonb("selected_layers").notNull().default([]),
  isCustomGeometry: boolean("is_custom_geometry").notNull().default(false),
  status: text("status").notNull().default("draft"), // draft, processing, completed, failed
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  shareTokenIdx: uniqueIndex("projects_share_token_idx").on(table.shareToken),
  ownerIdx: index("projects_owner_idx").on(table.ownerToken),
  userIdx: index("projects_user_idx").on(table.userId),
}));

// ---------------------------------------------------------------------------
// Generated raster layers (metadata + on-disk path + stats + thumbnail)
// ---------------------------------------------------------------------------
export const generatedLayers = pgTable("generated_layers", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull(),
  layerKey: text("layer_key").notNull(),
  layerLabel: text("layer_label").notNull(),
  category: text("category").notNull(),
  resolution: integer("resolution").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  crs: text("crs").notNull().default("EPSG:4326"),
  filePath: text("file_path").notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  unit: text("unit").notNull().default(""),
  stats: jsonb("stats").notNull(),
  legend: jsonb("legend"),
  thumbnail: text("thumbnail").notNull(),
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectIdx: index("generated_layers_project_idx").on(table.projectId),
}));

// ---------------------------------------------------------------------------
// Processing jobs (simulated async pipeline with progress reporting)
// ---------------------------------------------------------------------------
export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull(),
  status: text("status").notNull().default("queued"), // queued, running, completed, failed
  progress: integer("progress").notNull().default(0),
  message: text("message").notNull().default("Queued"),
  totalLayers: integer("total_layers").notNull().default(0),
  completedLayers: integer("completed_layers").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectIdx: index("jobs_project_idx").on(table.projectId),
}));
