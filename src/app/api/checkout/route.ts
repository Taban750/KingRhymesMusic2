import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { songs, albums, mediaVideos, merchProducts, purchases } from "@/db/schema";
import { eq } from "drizzle-orm";
import { rateLimit } from "@/lib/auth";
import { convertUsd, CURRENCIES } from "@/lib/currency";
import { createFlutterwaveCheckout } from "@/lib/flutterwave";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "anon";
    if (!rateLimit(`checkout:${ip}`, 20)) return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
    const { songId, albumId, videoId, merchProductId, merchSize, shippingName, shippingPhone, shippingAddress, email, provider = "flutterwave", currency = "USD", phone } = await req.json();
    const ids = [songId, albumId, videoId, merchProductId].filter(Boolean);
    if (ids.length !== 1 || !email) return NextResponse.json({ error: "A product and email are required" }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    if (provider !== "flutterwave") return NextResponse.json({ error: "Flutterwave is the configured payment provider" }, { status: 400 });
    if (!CURRENCIES[currency]) return NextResponse.json({ error: "Unsupported currency" }, { status: 400 });

    const merch = Boolean(merchProductId);
    if (merch && (!String(merchSize || "").trim() || !String(shippingName || "").trim() || !String(shippingPhone || "").trim() || !String(shippingAddress || "").trim())) return NextResponse.json({ error: "Size and delivery contact details are required" }, { status: 400 });
    const rows = songId ? await db.select().from(songs).where(eq(songs.id, songId)) : albumId ? await db.select().from(albums).where(eq(albums.id, albumId)) : videoId ? await db.select().from(mediaVideos).where(eq(mediaVideos.id, videoId)) : await db.select().from(merchProducts).where(eq(merchProducts.id, merchProductId));
    if (!rows.length) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    const product = rows[0];
    if (!product.isPublished) return NextResponse.json({ error: "Product not available" }, { status: 400 });
    if ("isFree" in product && product.isFree) return NextResponse.json({ error: "This item is free" }, { status: 400 });
    if (merch && !(product as typeof merchProducts.$inferSelect).availableSizes.includes(String(merchSize))) return NextResponse.json({ error: "Choose an available size" }, { status: 400 });

    const amount = convertUsd(Number(product.priceUsd), currency);
    const providerRef = `kr_purchase_${randomUUID()}`;

    const inserted = await db
      .insert(purchases)
      .values({
        songId,
        albumId,
        videoId,
        merchProductId,
        merchSize: merch ? String(merchSize).trim() : null,
        shippingName: merch ? String(shippingName).trim() : null,
        shippingPhone: merch ? String(shippingPhone).trim() : null,
        shippingAddress: merch ? String(shippingAddress).trim() : null,
        fulfillmentStatus: merch ? "unfulfilled" : "not_applicable",
        buyerEmail: String(email).toLowerCase(),
        amount: String(amount),
        currency,
        provider,
        providerRef,
        status: "pending",
      })
      .returning();

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
    const redirectUrl = new URL("/checkout/return", siteUrl);
    redirectUrl.searchParams.set("purchaseId", inserted[0].id);
    const checkoutUrl = await createFlutterwaveCheckout({
      reference: providerRef,
      amount,
      currency,
      email: String(email).toLowerCase(),
      phone: phone ? String(phone) : undefined,
      redirectUrl: redirectUrl.toString(),
      description: `Purchase: ${product.title}`,
    });

    return NextResponse.json({ purchaseId: inserted[0].id, providerRef, checkoutUrl });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
