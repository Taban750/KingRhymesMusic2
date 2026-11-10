import { db } from "@/db";
import { mediaVideos } from "@/db/schema";
import { desc } from "drizzle-orm";
import { CatalogListing } from "@/components/catalog-listing";

export default async function DownloadVideosPage() {
  const items = (await db.select().from(mediaVideos).orderBy(desc(mediaVideos.createdAt))).filter((item) => item.isPublished);
  return <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-10"><div className="text-center mb-8"><div className="text-[11px] uppercase tracking-[0.28em] text-[#D4AF37] font-bold">Video store</div><h1 className="font-display text-4xl sm:text-5xl mt-2">Videos</h1><p className="mt-2 text-sm text-white/50">Preview videos, then buy or download the full quality file.</p></div><CatalogListing kind="video" items={items.map((x) => ({ id: x.id, title: x.title, slug: x.slug, coverUrl: x.coverUrl, previewUrl: x.videoPreviewPath, description: x.description, priceUsd: Number(x.priceUsd), isFree: x.isFree }))} /></main>;
}
