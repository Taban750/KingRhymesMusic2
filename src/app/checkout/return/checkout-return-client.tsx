"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";

export default function CheckoutReturnClient() {
  const searchParams = useSearchParams();
  const started = useRef(false);
  const purchaseId = searchParams.get("purchaseId") || "";
  const donationId = searchParams.get("donationId") || "";
  const transactionId = searchParams.get("transaction_id") || "";
  const reference = searchParams.get("tx_ref") || "";
  const paymentStatus = searchParams.get("status") || "";
  const canVerify = paymentStatus.toLowerCase() === "successful" && !!transactionId && !!reference && (!!purchaseId || !!donationId);
  const [state, setState] = useState<{ loading: boolean; error: string; downloadUrl: string; kind: string }>(() => ({
    loading: canVerify,
    error: canVerify ? "" : "Payment was not completed. No order was marked as paid.",
    downloadUrl: "",
    kind: "",
  }));

  useEffect(() => {
    if (started.current || !canVerify) return;
    started.current = true;

    fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchaseId, donationId, transactionId, reference }),
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Payment verification failed");
        setState({ loading: false, error: "", downloadUrl: result.downloadUrl || "", kind: result.kind || "" });
      })
      .catch((error: unknown) => {
        setState({ loading: false, error: error instanceof Error ? error.message : "Payment verification failed", downloadUrl: "", kind: "" });
      });
  }, [canVerify, donationId, purchaseId, reference, transactionId]);

  return (
    <div className="mx-auto max-w-xl px-4 pt-20 text-center">
      {state.loading ? (
        <>
          <div className="mx-auto h-14 w-14 animate-spin rounded-full border-2 border-white/15 border-t-[#D4AF37]" />
          <h1 className="font-display mt-6 text-3xl">Confirming your payment</h1>
          <p className="mt-2 text-sm text-white/55">We are verifying the transaction with Flutterwave.</p>
        </>
      ) : state.error ? (
        <>
          <h1 className="font-display text-3xl">Payment not confirmed</h1>
          <p className="mt-3 text-sm text-white/55">{state.error}</p>
          <Link href={donationId ? "/support" : "/music"} className="mt-6 inline-block"><Button>Return to {donationId ? "support" : "music"}</Button></Link>
        </>
      ) : state.kind === "donation" ? (
        <>
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-3xl">♥</div>
          <h1 className="font-display mt-5 text-3xl">Webale nyo! Thank you.</h1>
          <p className="mt-2 text-sm text-white/55">Your donation is confirmed and will appear on the supporters wall.</p>
          <Link href="/support" className="mt-6 inline-block"><Button>Back to support</Button></Link>
        </>
      ) : state.kind === "merchandise" ? (
        <>
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-3xl">✓</div>
          <h1 className="font-display mt-5 text-3xl">Merch order confirmed</h1>
          <p className="mt-2 text-sm text-white/55">Your payment is confirmed. The team will contact you using the delivery details you provided.</p>
          <Link href="/merch" className="mt-6 inline-block"><Button>Back to merch</Button></Link>
        </>
      ) : (
        <>
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-3xl">✓</div>
          <h1 className="font-display mt-5 text-3xl">Payment confirmed</h1>
          <p className="mt-2 text-sm text-white/55">Your purchase is ready to download.</p>
          <a href={state.downloadUrl} className="mt-6 inline-block"><Button>Download your track</Button></a>
        </>
      )}
    </div>
  );
}
