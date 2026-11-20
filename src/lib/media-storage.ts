import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type MediaKind = "audio" | "video" | "album" | "preview" | "video-preview" | "cover" | "image" | "hero";

const folders: Record<MediaKind, string> = {
  audio: "audio", video: "videos", album: "albums", preview: "previews",
  "video-preview": "video-previews", cover: "covers", image: "gallery", hero: "hero",
};
const PUBLIC_BUCKET = process.env.SUPABASE_PUBLIC_MEDIA_BUCKET || "media-public";
const PRIVATE_BUCKET = process.env.SUPABASE_PRIVATE_MEDIA_BUCKET || "media-private";
const supabaseUrl = () => (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
const isPrivate = (kind: MediaKind) => kind === "audio" || kind === "video" || kind === "album";

function storageHeaders(extra: Record<string, string> = {}) {
  const key = serviceKey();
  if (!supabaseUrl() || !key) throw new Error("Configure the Supabase project URL and server-side Storage secret key");
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

async function storageRequest(pathname: string, init: RequestInit) {
  const response = await fetch(`${supabaseUrl()}/storage/v1${pathname}`, init);
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Supabase Storage request failed (${response.status})${message ? `: ${message.slice(0, 300)}` : ""}`);
  }
  return response;
}

function safeKey(kind: MediaKind, originalName: string) {
  const ext = path.extname(originalName).toLowerCase();
  if (!/^\.[a-z0-9]{2,5}$/.test(ext)) throw new Error("Unsupported file extension");
  return `${folders[kind]}/${Date.now()}-${randomUUID()}${ext}`;
}

export async function createUploadUrl(kind: MediaKind, originalName: string, contentType: string) {
  const key = safeKey(kind, originalName);
  const privateMedia = isPrivate(kind);
  const bucket = privateMedia ? PRIVATE_BUCKET : PUBLIC_BUCKET;
  const response = await storageRequest(`/object/upload/sign/${encodeURIComponent(bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST", headers: storageHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({}),
  });
  const result = await response.json() as { url?: string; signedURL?: string; token?: string; path?: string };
  const signedPath = result.url || result.signedURL;
  if (!signedPath && !result.token) throw new Error("Supabase did not return a signed upload URL");
  const uploadUrl = signedPath
    ? signedPath.startsWith("http")
      ? signedPath
      : `${supabaseUrl()}${signedPath.startsWith("/storage/v1/") ? "" : "/storage/v1"}${signedPath.startsWith("/") ? "" : "/"}${signedPath}`
    : `${supabaseUrl()}/storage/v1/object/upload/sign/${encodeURIComponent(bucket)}/${key}?token=${encodeURIComponent(result.token!)}`;
  const storedPath = privateMedia
    ? `supabase-private://${key}`
    : `${supabaseUrl()}/storage/v1/object/public/${encodeURIComponent(bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`;
  const projectHost = new URL(supabaseUrl()).host;
  const storageHost = projectHost.endsWith(".supabase.co")
    ? `${projectHost.slice(0, -".supabase.co".length)}.storage.supabase.co`
    : projectHost;
  return {
    uploadUrl, path: storedPath, method: "PUT" as const,
    headers: { "Content-Type": contentType }, token: result.token,
    bucket, objectName: key,
    resumableEndpoint: `https://${storageHost}/storage/v1/upload/resumable`,
  };
}

export async function storeMedia(kind: MediaKind, originalName: string, contentType: string, bytes: Uint8Array) {
  const key = safeKey(kind, originalName);
  if (process.env.NODE_ENV !== "production" && !serviceKey()) {
    const folder = folders[kind];
    const directory = isPrivate(kind)
      ? path.join(process.cwd(), ".private-uploads", folder)
      : path.join(process.cwd(), "public", "uploads", folder);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, path.basename(key)), Buffer.from(bytes));
    return isPrivate(kind) ? `local-private://${folder}/${path.basename(key)}` : `/uploads/${key}`;
  }
  const bucket = isPrivate(kind) ? PRIVATE_BUCKET : PUBLIC_BUCKET;
  await storageRequest(`/object/${encodeURIComponent(bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST",
    headers: storageHeaders({ "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable", "x-upsert": "true" }),
    body: Buffer.from(bytes),
  });
  return isPrivate(kind)
    ? `supabase-private://${key}`
    : `${supabaseUrl()}/storage/v1/object/public/${encodeURIComponent(bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export async function getPrivateMediaUrl(storedPath: string, expiresIn = 300, disposition = "attachment") {
  if (storedPath.startsWith("local-audio://")) {
    const name = path.basename(storedPath.slice("local-audio://".length));
    return { localBytes: await readFile(path.join(process.cwd(), ".private-uploads", "audio", name)) };
  }
  if (storedPath.startsWith("local-private://")) {
    const relative = storedPath.slice("local-private://".length);
    if (relative.split(/[\\/]/).some((part) => part === "..")) throw new Error("Invalid private media path");
    return { localBytes: await readFile(path.join(process.cwd(), ".private-uploads", relative)) };
  }
  if (!storedPath.startsWith("supabase-private://")) return null;
  const key = storedPath.slice("supabase-private://".length);
  if (!key || key.split("/").some((part) => part === "..")) throw new Error("Invalid private media key");
  const response = await storageRequest(`/object/sign/${encodeURIComponent(PRIVATE_BUCKET)}/${key.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST", headers: storageHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ expiresIn, ...(disposition === "inline" ? {} : { download: path.basename(key) }) }),
  });
  const result = await response.json() as { signedURL?: string; signedUrl?: string };
  const signedPath = result.signedURL || result.signedUrl;
  if (!signedPath) throw new Error("Supabase did not return a signed download URL");
  return { url: new URL(signedPath, `${supabaseUrl()}/storage/v1`).toString() };
}
