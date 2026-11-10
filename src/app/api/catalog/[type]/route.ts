import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { albums, mediaVideos, merchProducts } from "@/db/schema";
import { getSession, slugify } from "@/lib/auth";

function table(type: string) { return type === "albums" ? albums : type === "videos" ? mediaVideos : type === "merch" ? merchProducts : null; }

export async function GET(req: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params; const target = table(type);
  if (!target) return NextResponse.json({ error: "Unknown catalog" }, { status: 404 });
  const admin = new URL(req.url).searchParams.get("admin") === "1";
  if (admin) { const s = await getSession(); if (!s || s.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const rows = await db.select().from(target).orderBy(desc(target.createdAt));
  return NextResponse.json({ items: admin ? rows : rows.filter((r) => r.isPublished).map((r) => ({ ...r, ...(type === "albums" ? { archivePath: null } : type === "videos" ? { videoFullPath: null } : {}) })) });
}

export async function POST(req: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params; const target = table(type); const s = await getSession();
  if (!s || s.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  if (!target) return NextResponse.json({ error: "Unknown catalog" }, { status: 404 });
  try {
    const b = await req.json(); const title = String(b.title || "").trim();
    if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });
    const slug = `${slugify(String(b.slug || title))}-${Date.now().toString(36)}`;
    if (type === "merch") {
      if (!["cap", "tshirt", "hoodie"].includes(String(b.category)) || !String(b.imageUrl || "").trim()) return NextResponse.json({ error: "Choose a merch type and upload a product image" }, { status: 400 });
      const availableSizes = Array.isArray(b.availableSizes) ? b.availableSizes.map(String).map((v: string) => v.trim()).filter(Boolean) : [];
      const rows = await db.insert(merchProducts).values({ title, slug, category: String(b.category), imageUrl: String(b.imageUrl), galleryUrls: Array.isArray(b.galleryUrls) ? b.galleryUrls.map(String) : [], description: b.description || null, availableSizes: availableSizes.length ? availableSizes : ["One size"], priceUsd: String(b.priceUsd ?? "1.99"), isPublished: b.isPublished !== false }).returning();
      return NextResponse.json({ item: rows[0] });
    }
    const shared = { title, slug, coverUrl: b.coverUrl || null, description: b.description || null, priceUsd: String(b.priceUsd ?? (type === "albums" ? "9.99" : "1.99")), isFree: !!b.isFree, isPublished: b.isPublished !== false };
    const values = type === "albums" ? { ...shared, archivePath: b.archivePath || null, previewPath: b.previewPath || null } : { ...shared, videoFullPath: b.videoFullPath || null, videoPreviewPath: b.videoPreviewPath || null };
    const rows = await db.insert(target).values(values as never).returning();
    return NextResponse.json({ item: rows[0] });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Could not save catalog item" }, { status: 500 }); }
}
