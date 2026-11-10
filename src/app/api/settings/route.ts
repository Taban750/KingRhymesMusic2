import { NextResponse } from "next/server";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { DEFAULT_SETTINGS } from "@/lib/default-site-settings";
import { DEFAULT_HERO_IMAGE, DEFAULT_SOCIAL_LINKS, DEFAULT_STREAMING_LINKS } from "@/lib/site-content";

export async function GET() {
  try {
    const rows = await db.select().from(siteSettings);
    if (!rows.length) return NextResponse.json({ settings: { id: 1, ...DEFAULT_SETTINGS } });
    return NextResponse.json({
      settings: {
        ...DEFAULT_SETTINGS,
        ...rows[0],
        socialLinks: { ...DEFAULT_SOCIAL_LINKS, ...rows[0].socialLinks },
        streamingLinks: { ...DEFAULT_STREAMING_LINKS, ...rows[0].streamingLinks },
        heroImageUrl: rows[0].heroImageUrl || DEFAULT_HERO_IMAGE,
      },
    });
  } catch (e) {
    console.error("Failed to load site settings", e);
    return NextResponse.json({ settings: { id: 1, ...DEFAULT_SETTINGS } });
  }
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  try {
    const body = await req.json();
    const rows = await db.select().from(siteSettings);
    const allowed = ["artistName", "tagline", "heroText", "bio", "heroImageUrl", "featuredSongId", "socialLinks", "streamingLinks", "paymentMethods", "currencies", "approvalRequired", "pressKitUrl"] as const;
    const update: Record<string, unknown> = {};
    for (const k of allowed) {
      if (body[k] !== undefined) update[k] = body[k];
    }
    if (!rows.length) {
      const inserted = await db.insert(siteSettings).values({ id: 1, ...DEFAULT_SETTINGS, ...update } as never).returning();
      return NextResponse.json({ settings: inserted[0] });
    }
    const { eq } = await import("drizzle-orm");
    const updated = await db.update(siteSettings).set({ ...update, updatedAt: new Date() }).where(eq(siteSettings.id, rows[0].id)).returning();
    return NextResponse.json({ settings: updated[0] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
