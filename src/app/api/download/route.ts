import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/db";
import { songs, albums, mediaVideos, purchases } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyDownload } from "@/lib/auth";
import { getPrivateMediaUrl } from "@/lib/media-storage";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });
  const payload = verifyDownload(token);
  if (!payload || [payload.songId, payload.albumId, payload.videoId].filter(Boolean).length !== 1) return NextResponse.json({ error: "Link expired or invalid" }, { status: 401 });
  const kind = payload.songId ? "song" : payload.albumId ? "album" : "video";
  const id = payload.songId || payload.albumId || payload.videoId!;
  const rows = kind === "song" ? await db.select().from(songs).where(eq(songs.id, id)) : kind === "album" ? await db.select().from(albums).where(eq(albums.id, id)) : await db.select().from(mediaVideos).where(eq(mediaVideos.id, id));
  if (!rows.length) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  const item = rows[0];
  if (!item.isPublished) return NextResponse.json({ error: "Item unavailable" }, { status: 404 });
  if (!item.isFree) {
    if (!payload.purchaseId) return NextResponse.json({ error: "Purchase required" }, { status: 402 });
    const pRows = await db.select().from(purchases).where(eq(purchases.id, payload.purchaseId));
    const purchase = pRows[0];
    if (!purchase || purchase.status !== "completed" || purchase.songId !== (payload.songId || null) || purchase.albumId !== (payload.albumId || null) || purchase.videoId !== (payload.videoId || null)) return NextResponse.json({ error: "Purchase required" }, { status: 402 });
  }
  const mediaPath = kind === "song" ? (item as typeof songs.$inferSelect).audioFullPath : kind === "album" ? (item as typeof albums.$inferSelect).archivePath : (item as typeof mediaVideos.$inferSelect).videoFullPath;
  if (!mediaPath) return NextResponse.json({ error: "Full media is not available" }, { status: 404 });
  if (mediaPath.startsWith("http")) return NextResponse.redirect(mediaPath);
  try {
    const inline = new URL(req.url).searchParams.get("inline") === "1" && kind === "video";
    const privateMedia = await getPrivateMediaUrl(mediaPath, 300, inline ? "inline" : "attachment");
    if (privateMedia?.url) return NextResponse.redirect(privateMedia.url);
    const bytes = privateMedia?.localBytes ?? await readFile(path.join(process.cwd(), "public", mediaPath.replace(/^\//, "")));
    const ext = mediaPath.split(".").pop()?.toLowerCase() || "bin";
    const mime = kind === "video" ? ext === "webm" ? "video/webm" : "video/mp4" : kind === "album" ? "application/zip" : ext === "wav" ? "audio/wav" : ext === "m4a" ? "audio/mp4" : "audio/mpeg";
    return new NextResponse(new Uint8Array(bytes), { headers: { "Content-Type": mime, "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${path.basename(mediaPath)}"`, "Cache-Control": "private, max-age=60" } });
  } catch (e) { console.error("Private media delivery failed", e); return NextResponse.json({ error: "File missing on server" }, { status: 404 }); }
}
