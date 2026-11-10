import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createUploadUrl, type MediaKind } from "@/lib/media-storage";

export const runtime = "nodejs";

const allowed: Record<MediaKind, { max: number; extensions: string[] }> = {
  audio: { max: 1024 ** 3, extensions: ["mp3", "wav", "m4a", "ogg", "flac"] },
  preview: { max: 100 * 1024 ** 2, extensions: ["mp3", "wav", "m4a", "ogg", "flac"] },
  video: { max: 2 * 1024 ** 3, extensions: ["mp4", "webm", "mov", "m4v"] },
  "video-preview": { max: 300 * 1024 ** 2, extensions: ["mp4", "webm", "mov", "m4v"] },
  album: { max: 2 * 1024 ** 3, extensions: ["zip"] },
  cover: { max: 15 * 1024 ** 2, extensions: ["jpg", "jpeg", "png", "webp", "gif"] },
  image: { max: 15 * 1024 ** 2, extensions: ["jpg", "jpeg", "png", "webp", "gif"] },
  hero: { max: 15 * 1024 ** 2, extensions: ["jpg", "jpeg", "png", "webp", "gif"] },
};

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  try {
    const { name, type, size, kind } = await req.json();
    const rule = allowed[kind as MediaKind];
    if (!rule || typeof name !== "string" || typeof type !== "string" || !Number.isSafeInteger(size) || size <= 0) return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });
    const ext = name.split(".").pop()?.toLowerCase() || "";
    if (!rule.extensions.includes(ext)) return NextResponse.json({ error: `Unsupported ${kind} file type` }, { status: 400 });
    if (size > rule.max) return NextResponse.json({ error: `File too large (max ${Math.floor(rule.max / 1024 ** 2)}MB)` }, { status: 413 });
    const result = await createUploadUrl(kind, name, type || "application/octet-stream");
    return NextResponse.json(result);
  } catch (e) {
    console.error("Upload URL creation failed", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload setup failed" }, { status: 500 });
  }
}
