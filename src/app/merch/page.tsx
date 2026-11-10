import { db } from "@/db";
import { merchProducts } from "@/db/schema";
import { desc } from "drizzle-orm";
import { MerchStore } from "@/components/merch-store";

export default async function MerchPage() {
  const items = (await db.select().from(merchProducts).orderBy(desc(merchProducts.createdAt))).filter((item) => item.isPublished);
  return <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 pb-16"><div className="text-center mb-8"><div className="text-[11px] uppercase tracking-[0.28em] text-[#D4AF37] font-bold">Official store</div><h1 className="font-display text-4xl sm:text-5xl mt-2">KING RHYMES Merch</h1><p className="mt-2 text-sm text-white/50">Caps, T-shirts and hoodies. Choose your size and delivery details at checkout.</p></div><MerchStore items={items.map((item) => ({ id: item.id, title: item.title, slug: item.slug, category: item.category, imageUrl: item.imageUrl, galleryUrls: item.galleryUrls, description: item.description, sizes: item.availableSizes, priceUsd: Number(item.priceUsd) }))} /></main>;
}
