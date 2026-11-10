"use client";
import { useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { CheckoutModal } from "@/components/checkout";

type Item = { id: string; title: string; slug: string; coverUrl: string | null; previewUrl: string | null; description: string | null; priceUsd: number; isFree: boolean };
export function CatalogListing({ kind, items }: { kind: "album" | "video"; items: Item[] }) {
  const [selected, setSelected] = useState<Item | null>(null);
  return <>
    {!items.length ? <p className="text-center text-sm text-white/40">No {kind === "album" ? "albums" : "downloadable videos"} available yet.</p> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{items.map((item) => <Card key={item.id}>
      {item.coverUrl ? <img src={item.coverUrl} alt="" className="h-48 w-full rounded-xl object-cover" /> : <div className="h-48 rounded-xl bg-white/5 grid place-items-center text-6xl">{kind === "album" ? "💿" : "🎬"}</div>}
      <div className="mt-3 flex items-center gap-2"><div className="font-bold">{item.title}</div>{item.isFree && <Badge>Free</Badge>}</div>
      {item.description && <p className="mt-1 line-clamp-3 text-sm text-white/50">{item.description}</p>}
      {item.previewUrl && (kind === "album" ? <audio controls preload="none" src={item.previewUrl} className="mt-3 w-full" /> : <video controls preload="none" src={item.previewUrl} poster={item.coverUrl || undefined} className="mt-3 max-h-48 w-full rounded-xl bg-black" />)}
      <div className="mt-3 text-[#D4AF37] font-bold">{item.isFree ? "Free" : `$${item.priceUsd.toFixed(2)}`}</div><Button className="w-full mt-3" onClick={() => setSelected(item)}>{item.isFree ? "Get download" : "Buy and download"}</Button>
    </Card>)}</div>}
    {selected && <CheckoutModal open onClose={() => setSelected(null)} song={{ id: selected.id, title: selected.title, slug: selected.slug, priceUsd: selected.priceUsd, isFree: selected.isFree, coverUrl: selected.coverUrl }} productType={kind} />}
  </>;
}
