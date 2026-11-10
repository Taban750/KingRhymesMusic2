import { NextResponse } from "next/server";
import { settleFlutterwaveTransaction } from "@/lib/flutterwave-settlement";
import { signDownload } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { purchaseId, donationId, transactionId, reference } = await req.json();
    if ((!purchaseId && !donationId) || !transactionId || !reference) {
      return NextResponse.json({ error: "Payment return details are incomplete" }, { status: 400 });
    }

    const expected = purchaseId
      ? { kind: "purchase" as const, id: String(purchaseId) }
      : { kind: "donation" as const, id: String(donationId) };
    const settled = await settleFlutterwaveTransaction(String(transactionId), String(reference), expected);

    if (settled.kind === "donation") return NextResponse.json({ status: "completed", kind: "donation" });
    if (settled.merchProductId) return NextResponse.json({ status: "completed", kind: "merchandise", orderId: settled.id });
    if (!settled.songId && !settled.albumId && !settled.videoId) return NextResponse.json({ error: "Purchase has no product attached" }, { status: 409 });
    const token = signDownload({ purchaseId: settled.id, songId: settled.songId || undefined, albumId: settled.albumId || undefined, videoId: settled.videoId || undefined, email: settled.email }, "24h");
    return NextResponse.json({ status: "completed", kind: "purchase", downloadUrl: `/api/download?token=${token}` });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Payment could not be verified" }, { status: 402 });
  }
}
