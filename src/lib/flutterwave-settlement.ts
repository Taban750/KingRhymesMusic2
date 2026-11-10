import { db } from "@/db";
import { donations, purchases } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyFlutterwaveTransaction } from "@/lib/flutterwave";

export async function settleFlutterwaveTransaction(transactionId: string, reference: string, expected?: { kind: "purchase" | "donation"; id: string }) {
  const [purchaseRows, donationRows] = await Promise.all([
    db.select().from(purchases).where(eq(purchases.providerRef, reference)),
    db.select().from(donations).where(eq(donations.providerRef, reference)),
  ]);

  if (purchaseRows.length + donationRows.length !== 1) {
    throw new Error("Payment reference was not found");
  }

  if (purchaseRows.length) {
    const purchase = purchaseRows[0];
    if (expected && (expected.kind !== "purchase" || expected.id !== purchase.id)) throw new Error("Purchase does not match this payment");
    if (purchase.provider !== "flutterwave") throw new Error("Payment provider does not match");
    if (purchase.status !== "completed") {
      await verifyFlutterwaveTransaction(transactionId, {
        reference,
        amount: Number(purchase.amount),
        currency: purchase.currency,
        email: purchase.buyerEmail,
      });
      await db.update(purchases).set({ status: "completed" }).where(eq(purchases.id, purchase.id));
    }
    return { kind: "purchase" as const, id: purchase.id, songId: purchase.songId, albumId: purchase.albumId, videoId: purchase.videoId, merchProductId: purchase.merchProductId, email: purchase.buyerEmail };
  }

  const donation = donationRows[0];
  if (expected && (expected.kind !== "donation" || expected.id !== donation.id)) throw new Error("Donation does not match this payment");
  if (donation.provider !== "flutterwave") throw new Error("Payment provider does not match");
  if (donation.status !== "completed") {
    await verifyFlutterwaveTransaction(transactionId, {
      reference,
      amount: Number(donation.amount),
      currency: donation.currency,
      email: donation.donorEmail,
    });
    await db.update(donations).set({ status: "completed" }).where(eq(donations.id, donation.id));
  }
  return { kind: "donation" as const, id: donation.id };
}
