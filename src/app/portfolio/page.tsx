import { db } from "@/db";
import { siteSettings, songs, ratings, galleryItems, videos, pressItems } from "@/db/schema";
import PortfolioClient from "./portfolio-client";
import { DEFAULT_GALLERY_PHOTOS, DEFAULT_STREAMING_LINKS } from "@/lib/site-content";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  let settings: Record<string, unknown> = { artistName: "KING RHYMES", tagline: "Where Rhymes Reign", streamingLinks: DEFAULT_STREAMING_LINKS };
  let discography: Record<string, unknown>[] = [];
  let gallery: { imageUrl: string; caption?: string | null }[] = [];
  let vids: { youtubeId: string; title: string }[] = [];
  let press: { outlet: string; quote: string; author?: string | null }[] = [];
  try {
    const s = await db.select().from(siteSettings);
    if (s[0]) settings = { ...settings, ...s[0], streamingLinks: { ...DEFAULT_STREAMING_LINKS, ...s[0].streamingLinks } } as Record<string, unknown>;
  } catch (error) {
    console.error("Failed to load portfolio settings", error);
  }
  try {
    const all = await db.select().from(songs);
    await db.select().from(ratings).catch((error) => {
      console.error("Failed to load portfolio ratings", error);
      return [];
    });
    discography = all.filter((x) => x.isPublished).slice(0, 8) as unknown as Record<string, unknown>[];
  } catch (error) {
    console.error("Failed to load portfolio discography", error);
  }
  try { gallery = await db.select().from(galleryItems); } catch (error) { console.error("Failed to load portfolio gallery", error); }
  try { vids = await db.select().from(videos); } catch (error) { console.error("Failed to load portfolio videos", error); }
  try { press = await db.select().from(pressItems); } catch (error) { console.error("Failed to load portfolio press items", error); }

  const fallbackGallery = gallery.length ? gallery : DEFAULT_GALLERY_PHOTOS;
  const fallbackVideos = vids;
  const fallbackPress = press;

  return <PortfolioClient settings={settings} discography={discography} gallery={fallbackGallery} videos={fallbackVideos} press={fallbackPress} />;
}
