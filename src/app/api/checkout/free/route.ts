import { NextResponse } from "next/server";
import { db } from "@/db";
import { songs, albums, mediaVideos, purchases } from "@/db/schema";
import { eq } from "drizzle-orm";
import { signDownload } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { songId, albumId, videoId, email } = await req.json();
    if ([songId, albumId, videoId].filter(Boolean).length !== 1) return NextResponse.json({ error: "Choose one product" }, { status: 400 });
    const rows = songId ? await db.select().from(songs).where(eq(songs.id, songId)) : albumId ? await db.select().from(albums).where(eq(albums.id, albumId)) : await db.select().from(mediaVideos).where(eq(mediaVideos.id, videoId));
    if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const product = rows[0];
    if (!product.isFree || !product.isPublished) return NextResponse.json({ error: "Not available for free" }, { status: 400 });
    const inserted = await db
      .insert(purchases)
      .values({
        songId,
        albumId,
        videoId,
        buyerEmail: String(email || "fan@example.com").toLowerCase(),
        amount: "0",
        currency: "USD",
        provider: "free",
        providerRef: `free_${Date.now()}`,
        status: "completed",
      })
      .returning();
    const token = signDownload({ purchaseId: inserted[0].id, songId, albumId, videoId, email: String(email) }, "24h");
    return NextResponse.json({ purchaseId: inserted[0].id, downloadUrl: `/api/download?token=${token}` });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
