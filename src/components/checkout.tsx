"use client";
import { useState } from "react";
import { Modal, Button, Input, Textarea } from "./ui";
import { useToast, useCurrency } from "./providers";
import { formatMoney, convertUsd } from "@/lib/currency";

export function CheckoutModal({
  open,
  onClose,
  song,
  userEmail,
  productType = "song",
}: {
  open: boolean;
  onClose: () => void;
  song: { id: string; title: string; slug: string; priceUsd: number; isFree: boolean; coverUrl?: string | null; sizes?: string[] };
  userEmail?: string;
  productType?: "song" | "album" | "video" | "merch";
}) {
  const { push } = useToast();
  const { currency } = useCurrency();
  const [email, setEmail] = useState(userEmail || "");
  const [phone, setPhone] = useState("");
  const [merchSize, setMerchSize] = useState("");
  const [shippingName, setShippingName] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ downloadUrl: string; ref: string } | null>(null);

  const localAmount = convertUsd(song.priceUsd, currency);

  async function startPayment() {
    if (song.isFree) {
      setLoading(true);
      try {
        const r = await fetch("/api/checkout/free", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [productType === "merch" ? "merchProductId" : `${productType}Id`]: song.id, email: email || userEmail || "fan@example.com" }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Failed");
        setDone({ downloadUrl: j.downloadUrl, ref: j.purchaseId });
        push("Free download unlocked!", "success");
      } catch (e: unknown) {
        push(e instanceof Error ? e.message : "Failed", "error");
      } finally {
        setLoading(false);
      }
      return;
    }
    if (!email.includes("@")) {
      push("Enter a valid email for Flutterwave checkout", "error");
      return;
    }
    if (productType === "merch" && (!merchSize || !shippingName.trim() || !shippingPhone.trim() || !shippingAddress.trim())) {
      push("Enter a size and complete delivery details", "error");
      return;
    }
    if (phone && !/^[0-9+\s-]{7,15}$/.test(phone)) {
      push("Enter a valid mobile money number, e.g. 0772 123456", "error");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [productType === "merch" ? "merchProductId" : `${productType}Id`]: song.id, email, provider: "flutterwave", currency, phone, ...(productType === "merch" ? { merchSize, shippingName, shippingPhone, shippingAddress } : {}) }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Checkout failed");
      if (!j.checkoutUrl) throw new Error("Flutterwave did not return a checkout link");
      window.location.assign(j.checkoutUrl);
    } catch (e: unknown) {
      push(e instanceof Error ? e.message : "Payment failed", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      {!done ? (
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#D4AF37]">Secure checkout</div>
          <h3 className="font-display text-2xl mt-1">{song.title}</h3>
          <div className="mt-4 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            {song.coverUrl ? <img src={song.coverUrl} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <div className="h-14 w-14 rounded-xl bg-white/10 grid place-items-center">♪</div>}
            <div className="flex-1">
              <div className="text-sm font-semibold">{song.isFree ? "Free download" : formatMoney(song.priceUsd, currency)}</div>
              <div className="text-xs text-white/50">{productType === "merch" ? "We will contact you to deliver your order" : "Secure private download • Instant delivery • Yours forever"}</div>
            </div>
          </div>

          {!song.isFree && (
            <>
              <div className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-white/50">Pay securely with Flutterwave</div>
              <p className="mt-2 text-sm text-white/60">Mobile Money and cards are available at Flutterwave checkout.</p>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs text-white/60">Email for Flutterwave checkout</label>
                  <div className="mt-1"><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" /></div>
                </div>
                <div>
                  <label className="text-xs text-white/60">Mobile Money number (optional)</label>
                  <div className="mt-1"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0772 123456" /></div>
                </div>
                {productType === "merch" && <div className="space-y-3">
                  <div><label className="text-xs text-white/60">Size</label><div className="mt-1"><select value={merchSize} onChange={(e) => setMerchSize(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm"><option value="">Choose a size</option>{((song as typeof song & { sizes?: string[] }).sizes || []).map((size) => <option key={size} value={size}>{size}</option>)}</select></div></div>
                  <div><label className="text-xs text-white/60">Name for delivery</label><div className="mt-1"><Input value={shippingName} onChange={(e) => setShippingName(e.target.value)} placeholder="Full name" /></div></div>
                  <div><label className="text-xs text-white/60">Delivery phone</label><div className="mt-1"><Input value={shippingPhone} onChange={(e) => setShippingPhone(e.target.value)} placeholder="Phone number" /></div></div>
                  <div><label className="text-xs text-white/60">Delivery address</label><div className="mt-1"><Textarea value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder="Street, area, city, country" /></div></div>
                </div>}
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3 text-[11px] text-white/50 flex items-center gap-2">
                <span>🔒</span> Secure Flutterwave checkout • Payment confirmed by the server
              </div>
            </>
          )}

          {song.isFree && (
            <div className="mt-4">
              <label className="text-xs text-white/60">Email for download link</label>
              <div className="mt-1"><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" /></div>
            </div>
          )}

          <Button onClick={startPayment} disabled={loading} className="w-full mt-5">
            {loading ? "Processing securely…" : song.isFree ? "Get free download" : `Continue to Flutterwave • ${formatMoney(song.priceUsd, currency)}`}
          </Button>
          <p className="mt-3 text-center text-[11px] text-white/40">
            {song.isFree ? "Free for fans — consider donating to support." : `Charged in ${currency} (${localAmount.toLocaleString()} ${currency}). USD base $${song.priceUsd.toFixed(2)}.`}
          </p>
        </div>
      ) : (
        <div className="text-center py-4">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-3xl">✓</div>
          <h3 className="font-display text-2xl mt-4">Thank you! 🎶</h3>
          <p className="mt-2 text-sm text-white/60">Your download link expires in 24 hours.</p>
          <p className="mt-2 text-[11px] text-white/40">Ref: {done.ref}</p>
          <a href={done.downloadUrl} className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-bold text-black hover:bg-[#F1D97A]">
            ⬇ Download {productType === "album" ? "album" : productType === "video" ? "video" : "track"}
          </a>
          <div className="mt-3">
            <button onClick={onClose} className="text-xs text-white/50 hover:text-white">Close</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
