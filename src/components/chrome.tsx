"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCurrency } from "./providers";
import { CURRENCIES } from "@/lib/currency";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/music", label: "Music" },
  { href: "/store", label: "Store" },
  { href: "/merch", label: "Merch" },
  { href: "/albums", label: "Albums" },
  { href: "/videos", label: "Videos" },
  { href: "/about", label: "About" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/support", label: "Support" },
  { href: "/contact", label: "Contact" },
];

export function Navbar({ artistName, user }: { artistName: string; user: { email: string; role: string; displayName: string } | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { currency, setCurrency } = useCurrency();
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={`fixed top-0 inset-x-0 z-[80] border-b backdrop-blur-2xl transition-all ${scrolled ? "border-[#D4AF37]/15 bg-[#151410]/80 shadow-[0_12px_36px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]" : "border-white/[0.04] bg-[#151410]/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5 group">
          <img src="/pics/king-rhymes-logo.webp" alt="" className="h-10 w-10 shrink-0 rounded-full" />
          <span className="leading-none">
            <span className="block font-display text-lg tracking-[0.12em]">{artistName || "KING RHYMES"}</span>
            <span className="block text-[9px] uppercase tracking-[0.3em] text-[#D4AF37]/80">Where Rhymes Reign</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-full px-4 py-2 text-sm transition ${pathname === l.href ? "bg-[#D4AF37]/15 text-[#D4AF37]" : "text-white/70 hover:text-white hover:bg-white/5"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-2">
          <Link href="/music" className="rounded-full border border-[#F1D97A]/50 bg-[linear-gradient(145deg,#F1D97A,#D4AF37_58%,#B58D25)] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_6px_0_rgba(85,62,16,0.2),0_10px_24px_rgba(0,0,0,0.25)] transition hover:brightness-110">
            ▶ Listen Now
          </Link>
          <Link href="/albums" className="rounded-full border border-[#D4AF37]/60 bg-[#D4AF37]/10 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-[#D4AF37] hover:bg-[#D4AF37]/20 transition">
            💿 Buy An Album
          </Link>
          {user ? (
            <>
              {user.role === "admin" && (
                <Link href="/admin" className="rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-4 py-2 text-xs font-bold text-[#D4AF37]">
                  ♛ ADMIN
                </Link>
              )}
              <button
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/";
                }}
                className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/70 hover:text-white"
                title={user.displayName}
              >
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className="rounded-full px-3 py-2 text-xs text-white/70 hover:text-white">
              Log in
            </Link>
          )}
        </div>
        <div className="flex md:hidden items-center gap-2">
          <Link href="/music" className="rounded-full border border-[#F1D97A]/50 bg-gradient-to-br from-[#F1D97A] via-[#D4AF37] to-[#B58D25] px-4 py-2 text-[11px] font-black uppercase text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_4px_0_rgba(85,62,16,0.22)]">
            ▶ Listen
          </Link>
          <button className="glass-surface h-10 w-10 grid place-items-center rounded-full" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-[#D4AF37]/15 bg-[#151410]/95 px-4 py-4 flex flex-col gap-1 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`rounded-xl px-4 py-3 text-sm ${pathname === l.href ? "bg-[#D4AF37]/15 text-[#D4AF37]" : "text-white/80"}`}
            >
              {l.label}
            </Link>
          ))}
          <div className="flex items-center gap-2 pt-3">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="clay-inset flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm" aria-label="Currency">
              {Object.keys(CURRENCIES).map((c) => (
                <option key={c} value={c} className="bg-black">
                  {c} — {CURRENCIES[c].label}
                </option>
              ))}
            </select>
          </div>
          {user ? (
            <div className="flex gap-2 pt-2">
              {user.role === "admin" && (
                <Link href="/admin" onClick={() => setOpen(false)} className="flex-1 text-center rounded-xl border border-[#F1D97A]/50 bg-gradient-to-br from-[#F1D97A] via-[#D4AF37] to-[#B58D25] px-4 py-3 text-sm font-bold text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_4px_0_rgba(85,62,16,0.22)]">
                  ♛ Admin
                </Link>
              )}
              <button
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/";
                }}
                className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm"
              >
                Logout ({user.displayName})
              </button>
            </div>
          ) : (
            <div className="flex gap-2 pt-2">
              <Link href="/login" onClick={() => setOpen(false)} className="flex-1 text-center rounded-xl border border-white/10 px-4 py-3 text-sm">
                Log in
              </Link>
              <Link href="/signup" onClick={() => setOpen(false)} className="flex-1 text-center rounded-xl border border-[#F1D97A]/50 bg-gradient-to-br from-[#F1D97A] via-[#D4AF37] to-[#B58D25] px-4 py-3 text-sm font-bold text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_4px_0_rgba(85,62,16,0.22)]">
                Join the Kingdom
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

const SOCIAL_ORDER = ["instagram", "youtube", "tiktok", "spotify", "facebook", "x", "whatsapp"];
const SOCIAL_LABEL: Record<string, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  spotify: "Spotify",
  audiomack: "Audiomack",
  boomplay: "Boomplay",
  x: "X",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
};

export function Footer({ artistName, socials }: { artistName: string; socials: Record<string, string> }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const entries = SOCIAL_ORDER.map((k) => [k, socials?.[k]] as const).filter(([, v]) => !!v);
  const fallback = entries.length === 0;

  async function subscribe() {
    if (!email.includes("@")) {
      setMsg("Enter a valid email");
      return;
    }
    try {
      const r = await fetch("/api/subscribers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      setMsg(r.ok ? "👑 Welcome to the Kingdom!" : "Could not subscribe");
      if (r.ok) setEmail("");
    } catch {
      setMsg("Could not subscribe");
    }
  }

  return (
    <footer className="mt-20 border-t border-[#D4AF37]/15 bg-[#11100e]/85 shadow-[0_-18px_54px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-2xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <img src="/pics/king-rhymes-logo.webp" alt="King Rhymes Music logo" className="h-12 w-12 shrink-0 rounded-full" />
            <span>
              <span className="block font-display text-2xl tracking-[0.12em]">{artistName || "KING RHYMES"}</span>
              <span className="block text-[10px] uppercase tracking-[0.3em] text-[#D4AF37]">Where Rhymes Reign 👑</span>
            </span>
          </div>
          <p className="text-sm text-[#A8A29A] max-w-md leading-relaxed">
            Independent Ugandan hip-hop / dancehall fusion from Kampala to the world. Own the masters directly — every purchase and donation funds the next record.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {fallback && <span className="text-xs text-white/40">Social links coming soon</span>}
            {entries.map(([k, v]) => (
              <a key={k} href={v} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/70 hover:border-[#D4AF37]/60 hover:text-[#D4AF37] capitalize">
                {SOCIAL_LABEL[k] || k}
              </a>
            ))}
          </div>
          <div className="mt-6 max-w-md">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-white/50 mb-2">👑 Join the Kingdom (newsletter)</div>
            <div className="flex gap-2">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && subscribe()}
                placeholder="you@example.com"
                type="email"
                aria-label="Email for newsletter"
                className="clay-inset flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm outline-none focus:border-[#D4AF37]/60"
              />
              <button onClick={subscribe} className="rounded-full border border-[#F1D97A]/50 bg-[linear-gradient(145deg,#F1D97A,#D4AF37_58%,#B58D25)] px-5 py-2.5 text-xs font-black uppercase text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_5px_0_rgba(85,62,16,0.2)] hover:brightness-110">
                Sign up
              </button>
            </div>
            {msg && <div className="mt-2 text-xs text-[#D4AF37]">{msg}</div>}
          </div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-white/50 mb-4">Explore</div>
          <div className="flex flex-col gap-2 text-sm">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="text-white/70 hover:text-[#D4AF37]">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-white/50 mb-4">Legal</div>
          <div className="flex flex-col gap-2 text-sm">
            <Link href="/terms" className="text-white/70 hover:text-[#D4AF37]">Terms of Service</Link>
            <Link href="/privacy" className="text-white/70 hover:text-[#D4AF37]">Privacy Policy</Link>
            <Link href="/refunds" className="text-white/70 hover:text-[#D4AF37]">Refund Policy</Link>
            <Link href="/admin" className="text-white/70 hover:text-[#D4AF37]">♛ Artist Login</Link>
          </div>
          <div className="mt-6 rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.06] p-4 text-xs text-white/60 leading-relaxed">
            🔒 Secure checkout via Flutterwave. Mobile Money and cards where enabled.
          </div>
        </div>
      </div>
      <div className="border-t border-white/[0.07]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/40">
          <span>© {new Date().getFullYear()} {artistName || "King Rhymes"}. All rights reserved. Made in Kampala 🇺🇬👑</span>
          <span>Prices in USD • Mobile Money • Cards</span>
        </div>
      </div>
      <div className="h-20" />
    </footer>
  );
}

export function SupportFloat() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push("/support")}
      className="fixed bottom-24 right-4 z-[85] group flex items-center gap-2 rounded-full border border-[#F1D97A]/60 bg-gradient-to-br from-[#F1D97A] to-[#D4AF37] pl-4 pr-5 py-3 text-sm font-black text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_6px_0_rgba(85,62,16,0.25),0_12px_40px_rgba(212,175,55,0.35)] hover:brightness-110 animate-glow"
      aria-label="Support King Rhymes"
    >
      <span className="text-lg">👑</span> Support the King
    </button>
  );
}
