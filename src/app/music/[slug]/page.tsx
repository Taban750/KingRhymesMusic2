import { db } from "@/db";
import { songs, ratings, purchases } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import SongView from "./song-view";
import { getSession, signDownload } from "@/lib/auth";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const rows = await db.select().from(songs).where(eq(songs.slug, slug));
    if (!rows.length) return { title: "Song not found" };
    const s = rows[0];
    return {
      title: `${s.title} — KING RHYMES`,
      description: s.description?.slice(0, 160) || `Listen to ${s.title} by KING RHYMES`,
      openGraph: {
        title: `${s.title} — KING RHYMES`,
        description: s.description?.slice(0, 160) || "",
        images: s.coverUrl ? [{ url: s.coverUrl }] : [],
        type: "music.song",
      },
    };
  } catch {
    return { title: "Music — KING RHYMES" };
  }
}

export default async function SongPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rows = await db.select().from(songs).where(eq(songs.slug, slug));
  if (!rows.length || !rows[0].isPublished) return notFound();
  const song = rows[0];

  const allRatings = await db.select().from(ratings);
  const mine = allRatings.filter((r) => r.songId === song.id);
  const avg = mine.length ? mine.reduce((a, b) => a + b.stars, 0) / mine.length : 0;

  const session = await getSession().catch(() => null);

  // check ownership
  let owned = song.isFree;
  let ownedPurchaseId: string | undefined;
  if (session && !owned) {
    const myPurchases = await db.select().from(purchases).catch(() => []);
    const purchase = myPurchases.find((p) => p.songId === song.id && p.status === "completed" && p.buyerEmail.toLowerCase() === session.email.toLowerCase());
    owned = !!purchase;
    ownedPurchaseId = purchase?.id;
  }
  const fullAudioUrl = owned && song.audioFullPath
    ? `/api/download?token=${encodeURIComponent(signDownload({ purchaseId: ownedPurchaseId, songId: song.id, email: session?.email }, "15m"))}&inline=1`
    : null;

  // related
  const all = await db.select().from(songs).catch(() => []);
  const related = all.filter((s) => s.id !== song.id && s.isPublished && (s.genre === song.genre || true)).slice(0, 4).map((s) => {
    const r = allRatings.filter((x) => x.songId === s.id);
    return { ...s, audioFullPath: null, avgRating: r.length ? r.reduce((a, b) => a + b.stars, 0) / r.length : 0, ratingCount: r.length };
  });

  return (
    <SongView
      song={{ id: song.id, title: song.title, slug: song.slug, coverUrl: song.coverUrl, audioPreviewPath: song.audioPreviewPath, fullAudioUrl, description: song.description, lyrics: song.lyrics, genre: song.genre, priceUsd: parseFloat(song.priceUsd as string), isFree: song.isFree, playCount: song.playCount, avgRating: avg, ratingCount: mine.length }}
      user={session ? { id: session.id, email: session.email, displayName: session.displayName } : null}
      isAdmin={session?.role === "admin"}
      owned={owned}
      related={related.map((r) => ({ ...r, priceUsd: r.priceUsd as string }))}
    />
  );
}
