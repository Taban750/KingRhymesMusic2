import { NextResponse } from "next/server";
import { db } from "@/db";
import { songs, purchases, merchProducts, donations, comments, subscribers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { CURRENCIES } from "@/lib/currency";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const [songRows, purchaseRows, merchRows, donationRows, commentRows, subRows] = await Promise.all([
    db.select().from(songs),
    db.select().from(purchases),
    db.select().from(merchProducts),
    db.select().from(donations),
    db.select().from(comments),
    db.select().from(subscribers),
  ]);
  const completedPurchases = purchaseRows.filter((p) => p.status === "completed");
  const completedDonations = donationRows.filter((d) => d.status === "completed");
  const toUsd = (amount: string, currency: string) => Number(amount) / (CURRENCIES[currency]?.rate || 1);
  const revenue = completedPurchases.reduce((sum, p) => sum + toUsd(p.amount, p.currency), 0);
  const donationTotal = completedDonations.reduce((sum, d) => sum + toUsd(d.amount, d.currency), 0);
  const plays = songRows.reduce((a, s) => a + (s.playCount || 0), 0);

  // earnings over time (last 14 days)
  const days: { date: string; revenue: number; donations: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const rev = completedPurchases.filter((p) => p.createdAt && p.createdAt.toISOString().slice(0, 10) === key).reduce((sum, p) => sum + toUsd(p.amount, p.currency), 0);
    const don = completedDonations.filter((p) => p.createdAt && p.createdAt.toISOString().slice(0, 10) === key).reduce((sum, p) => sum + toUsd(p.amount, p.currency), 0);
    days.push({ date: key.slice(5), revenue: rev, donations: don });
  }

  return NextResponse.json({
    revenue,
    donationTotal,
    plays,
    songCount: songRows.length,
    salesCount: completedPurchases.length,
    pendingSales: purchaseRows.filter((p) => p.status === "pending").length,
    commentCount: commentRows.length,
    subscriberCount: subRows.length,
    earnings: days,
    recentPurchases: [...purchaseRows].sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)).slice(0, 30).map((purchase) => ({
      ...purchase,
      merchTitle: merchRows.find((product) => product.id === purchase.merchProductId)?.title || null,
    })),
    recentDonations: donationRows.slice(0, 10),
    recentComments: commentRows.slice(0, 10),
  });
}
