"use client";
import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { CheckoutModal } from "@/components/checkout";

type Item = { id: string; title: string; slug: string; category: string; imageUrl: string; galleryUrls: string[]; description: string | null; sizes: string[]; priceUsd: number };
export function MerchStore({ items }: { items: Item[] }) {
  const [selected, setSelected] = useState<Item | null>(null);
  return <>
    {!items.length ? <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-white/45">Merchandise is coming soon.</div> : <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => <Card key={item.id}>
      <img src={item.imageUrl} alt={item.title} className="aspect-square w-full rounded-xl object-cover" />
      {item.galleryUrls.length > 0 && <div className="mt-2 flex gap-2 overflow-x-auto">{item.galleryUrls.map((url, index) => <img key={`${url}-${index}`} src={url} alt={`${item.title} view ${index + 2}`} className="h-14 w-14 shrink-0 rounded-lg object-cover" />)}</div>}
      <div className="mt-3 flex items-center justify-between gap-2"><h2 className="font-bold">{item.title}</h2><span className="rounded-full bg-white/5 px-3 py-1 text-[11px] uppercase text-white/60">{item.category === "tshirt" ? "T-shirt" : item.category}</span></div>
      {item.description && <p className="mt-2 text-sm text-white/55">{item.description}</p>}
      <div className="mt-3 text-[#D4AF37] font-bold">${item.priceUsd.toFixed(2)}</div>
      <div className="mt-1 text-[11px] text-white/40">Sizes: {item.sizes.join(", ")}</div>
      <Button className="mt-4 w-full" onClick={() => setSelected(item)}>Choose size & buy</Button>
    </Card>)}</div>}
    {selected && <CheckoutModal open onClose={() => setSelected(null)} productType="merch" song={{ id: selected.id, title: selected.title, slug: selected.slug, priceUsd: selected.priceUsd, isFree: false, coverUrl: selected.imageUrl, sizes: selected.sizes }} />}
  </>;
}
