import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { albums, mediaVideos, merchProducts } from "@/db/schema";
import { getSession, slugify } from "@/lib/auth";

function table(type: string) { return type === "albums" ? albums : type === "videos" ? mediaVideos : type === "merch" ? merchProducts : null; }
export async function PATCH(req: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params; const target = table(type); const s = await getSession();
  if (!s || s.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  if (!target) return NextResponse.json({ error: "Unknown catalog" }, { status: 404 });
  const b = await req.json(); const update: Record<string, unknown> = {};
  if (type === "merch") {
    for (const key of ["title", "category", "imageUrl", "description", "priceUsd", "isPublished"]) if (b[key] !== undefined) update[key] = key === "priceUsd" ? String(b[key]) : b[key];
    if (b.title) update.slug = slugify(String(b.title));
    if (b.galleryUrls !== undefined) update.galleryUrls = Array.isArray(b.galleryUrls) ? b.galleryUrls.map(String) : [];
    if (b.availableSizes !== undefined) update.availableSizes = Array.isArray(b.availableSizes) ? b.availableSizes.map(String).map((v: string) => v.trim()).filter(Boolean) : ["One size"];
    if (update.category && !["cap", "tshirt", "hoodie"].includes(String(update.category))) return NextResponse.json({ error: "Invalid merch category" }, { status: 400 });
    try { const rows = await db.update(target).set(update as never).where(eq(target.id, id)).returning(); return rows.length ? NextResponse.json({ item: rows[0] }) : NextResponse.json({ error: "Not found" }, { status: 404 }); }
    catch (e) { console.error(e); return NextResponse.json({ error: "Update failed" }, { status: 500 }); }
  }
  for (const key of ["title", "coverUrl", "description", "priceUsd", "isFree", "isPublished", type === "albums" ? "archivePath" : "videoFullPath", type === "albums" ? "previewPath" : "videoPreviewPath"]) if (b[key] !== undefined) update[key] = key === "priceUsd" ? String(b[key]) : b[key];
  if (b.title) update.slug = slugify(String(b.title));
  try { const rows = await db.update(target).set(update as never).where(eq(target.id, id)).returning(); return rows.length ? NextResponse.json({ item: rows[0] }) : NextResponse.json({ error: "Not found" }, { status: 404 }); }
  catch (e) { console.error(e); return NextResponse.json({ error: "Update failed" }, { status: 500 }); }
}
export async function DELETE(_req: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params; const target = table(type); const s = await getSession();
  if (!s || s.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  if (!target) return NextResponse.json({ error: "Unknown catalog" }, { status: 404 });
  try { await db.delete(target).where(eq(target.id, id)); return NextResponse.json({ ok: true }); }
  catch (e) { console.error(e); return NextResponse.json({ error: "This item has existing purchase records. Unpublish it to remove it from the store." }, { status: 409 }); }
}
