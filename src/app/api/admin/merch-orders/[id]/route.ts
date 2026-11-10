import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { purchases } from "@/db/schema";
import { getSession } from "@/lib/auth";

const statuses = new Set(["unfulfilled", "processing", "shipped", "delivered", "cancelled"]);
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { id } = await params;
  const { status } = await req.json();
  if (!statuses.has(status)) return NextResponse.json({ error: "Invalid fulfillment status" }, { status: 400 });
  const existing = await db.select({ id: purchases.id, merchProductId: purchases.merchProductId, status: purchases.status }).from(purchases).where(eq(purchases.id, id));
  if (!existing.length || !existing[0].merchProductId) return NextResponse.json({ error: "Merch order not found" }, { status: 404 });
  if (existing[0].status !== "completed") return NextResponse.json({ error: "Only paid orders can be fulfilled" }, { status: 409 });
  const rows = await db.update(purchases).set({ fulfillmentStatus: status }).where(eq(purchases.id, id)).returning({ id: purchases.id, fulfillmentStatus: purchases.fulfillmentStatus });
  if (!rows.length) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json({ order: rows[0] });
}
