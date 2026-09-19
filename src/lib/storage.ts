import fs from "node:fs";
import path from "node:path";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "generated");

export function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function projectDir(projectId: string): string {
  return path.join(STORAGE_ROOT, projectId);
}

export function layerFilePath(projectId: string, layerKey: string, ext = "tif"): string {
  return path.join(projectDir(projectId), `${layerKey}.${ext}`);
}

export function saveLayerFile(projectId: string, layerKey: string, data: Buffer | string, ext = "tif"): string {
  const dir = projectDir(projectId);
  ensureDir(dir);
  const filePath = layerFilePath(projectId, layerKey, ext);
  fs.writeFileSync(filePath, data);
  return filePath;
}


export function readLayerFile(filePath: string): Buffer {
  return fs.readFileSync(filePath);
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

export function deleteProjectDir(projectId: string) {
  const dir = projectDir(projectId);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}
