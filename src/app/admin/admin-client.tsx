"use client";
import { useEffect, useState } from "react";
import { Button, Input, Textarea, Card, Badge, Modal } from "@/components/ui";
import { useToast } from "@/components/providers";

type Tab = "overview" | "songs" | "albums" | "videos" | "merch" | "sales" | "donations" | "comments" | "portfolio" | "settings";

export default function AdminClient({ user }: { user: { email: string; displayName: string } }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);

  const [songs, setSongs] = useState<Record<string, unknown>[]>([]);
  const [albums, setAlbums] = useState<Record<string, unknown>[]>([]);
  const [mediaVideos, setMediaVideos] = useState<Record<string, unknown>[]>([]);
  const [merch, setMerch] = useState<Record<string, unknown>[]>([]);
  const [comments, setComments] = useState<Record<string, unknown>[]>([]);
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [portfolio, setPortfolio] = useState<{ milestones: unknown[]; gallery: unknown[]; videos: unknown[]; press: unknown[] }>({ milestones: [], gallery: [], videos: [], press: [] });
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [uploading, setUploading] = useState("");
  const { push } = useToast();

  async function loadAll() {
    push("Refreshing...", "info");
    try {
      const [st, so, co, se, pf, vi, al, mv, me] = await Promise.all([
        fetch("/api/admin/stats").then((r) => r.json()),
        fetch("/api/songs?admin=1").then((r) => r.json()),
        fetch("/api/comments?admin=1").then((r) => r.json()),
        fetch("/api/settings").then((r) => r.json()),
        fetch("/api/portfolio").then((r) => r.json()),
        fetch("/api/visitors").then((r) => r.json()),
        fetch("/api/catalog/albums?admin=1").then((r) => r.json()),
        fetch("/api/catalog/videos?admin=1").then((r) => r.json()),
        fetch("/api/catalog/merch?admin=1").then((r) => r.json()),
      ]);
      if (!st.error) setStats(st);
      setSongs(so.songs || []);
      setAlbums(al.items || []);
      setMediaVideos(mv.items || []);
      setMerch(me.items || []);
      setComments(co.comments || []);
      setSettings(se.settings || {});
      setPortfolio(pf);

      push("Refreshed ✓", "success");
    } catch (e) {
      console.error(e);
      push("Refresh failed", "error");
    }
  }
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) void loadAll();
    });
    return () => {
      active = false;
    };
  }, []);

  async function uploadFile(file: File, kind: string): Promise<string | null> {
    setUploading(kind);
    try {
      const sign = await fetch("/api/upload/presign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name, type: file.type || "application/octet-stream", size: file.size, kind }) });
      const j = await sign.json();
      if (!sign.ok) throw new Error(j.error || "Upload setup failed");
      const putResult = await fetch(j.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
      if (!putResult.ok) throw new Error(`Tigris upload failed (${putResult.status}). Check bucket CORS and key permissions.`);
      push("Uploaded ✓", "success");
      return j.path as string;
    } catch (e: unknown) {
      push(e instanceof Error ? e.message : "Upload failed", "error");
      return null;
    } finally {
      setUploading("");
    }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "📊 Overview" },
    { id: "songs", label: "🎵 Songs" },
    { id: "albums", label: "💿 Albums" },
    { id: "videos", label: "🎬 Download videos" },
    { id: "merch", label: "🧢 Merch" },
    { id: "sales", label: "💰 Sales" },
    { id: "donations", label: "♥ Donations" },
    { id: "comments", label: "💬 Comments" },
    { id: "portfolio", label: "🖼 Portfolio" },
    { id: "settings", label: "⚙ Settings" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-[#D4AF37] font-bold">Artist dashboard</div>
          <h1 className="font-display text-3xl sm:text-4xl">Hello, {user.displayName} 👋</h1>
        </div>
        <button onClick={loadAll} className="glass-surface rounded-full px-4 py-2 text-xs hover:border-[#D4AF37]/50">↻ Refresh</button>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto scrollbar-thin pb-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition ${tab === t.id ? "border border-[#F1D97A]/50 bg-gradient-to-br from-[#F1D97A] via-[#D4AF37] to-[#B58D25] text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_5px_0_rgba(85,62,16,0.22)]" : "clay-surface text-white/60 hover:text-white"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 pb-10">
        {tab === "overview" && <Overview stats={stats} />}
        {tab === "songs" && <SongsTab songs={songs} onReload={loadAll} editing={editing} setEditing={setEditing} showNew={showNew} setShowNew={setShowNew} uploadFile={uploadFile} uploading={uploading} push={push} />}
        {tab === "albums" && <CatalogTab kind="albums" items={albums} uploadFile={uploadFile} uploading={uploading} onReload={loadAll} push={push} />}
        {tab === "videos" && <CatalogTab kind="videos" items={mediaVideos} uploadFile={uploadFile} uploading={uploading} onReload={loadAll} push={push} />}
        {tab === "merch" && <MerchTab items={merch} uploadFile={uploadFile} uploading={uploading} onReload={loadAll} push={push} />}
        {tab === "sales" && <SalesTab stats={stats} />}
        {tab === "donations" && <DonationsTab stats={stats} />}
        {tab === "comments" && <CommentsTab comments={comments} onReload={loadAll} push={push} />}
        {tab === "portfolio" && <PortfolioTab portfolio={portfolio} onReload={loadAll} uploadFile={uploadFile} push={push} />}
        {tab === "settings" && <SettingsTab settings={settings} setSettings={setSettings} songs={songs} uploadFile={uploadFile} push={push} />}
      </div>
    </div>
  );
}
function Overview({ stats }: { stats: Record<string, unknown> | null }) {
  if (!stats) return <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/[0.05]" />)}</div>;
  const cards = [
    { l: "Revenue (sales)", v: "$" + Number(stats.revenue as number || 0).toFixed(2), e: "MONEY" },
    { l: "Donations", v: "$" + Number(stats.donationTotal as number || 0).toFixed(2), e: "HEART" },
    { l: "Plays", v: Number(stats.plays as number || 0).toLocaleString(), e: "PLAY" },
    { l: "Subscribers", v: String(stats.subscriberCount ?? 0), e: "MAIL" },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Card key={c.l}><div className="text-2xl">{c.e}</div><div className="font-display text-2xl sm:text-3xl mt-1">{c.v}</div><div className="text-xs text-white/50 mt-1">{c.l}</div></Card>
        ))}
      </div>
    </div>
  );
}

function SongsTab({ songs, onReload, editing, setEditing, showNew, setShowNew, uploadFile, uploading, push }: {
  songs: Record<string, unknown>[];
  onReload: () => void;
  editing: Record<string, unknown> | null;
  setEditing: (v: Record<string, unknown> | null) => void;
  showNew: boolean;
  setShowNew: (v: boolean) => void;
  uploadFile: (f: File, kind: string) => Promise<string | null>;
  uploading: string;
  push: (m: string, k?: "success" | "error" | "info") => void;
}) {
  const [form, setForm] = useState<Record<string, unknown>>({ title: "", genre: "Hip-Hop / Dancehall Fusion", priceUsd: "1.99", description: "", lyrics: "", isFree: false, isPublished: true, coverUrl: "", audioFullPath: "", audioPreviewPath: "" });

  async function save() {
    if (!String(form.title || "").trim()) return push("Title required", "error");
    const method = editing ? "PATCH" : "POST";
    const url = editing ? `/api/songs/${editing.id as string}` : "/api/songs";
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const j = await r.json();
    if (!r.ok) return push(j.error || "Save failed", "error");
    push(editing ? "Updated — live immediately ✓" : "Published ✓", "success");
    setEditing(null);
    setShowNew(false);
    setForm({ title: "", genre: "Hip-Hop / Dancehall Fusion", priceUsd: "1.99", description: "", lyrics: "", isFree: false, isPublished: true, coverUrl: "", audioFullPath: "", audioPreviewPath: "" });
    onReload();
  }

  async function del(id: string) {
    if (!confirm("Delete this song forever?")) return;
    await fetch(`/api/songs/${id}`, { method: "DELETE" });
    push("Deleted", "success");
    onReload();
  }

  const open = showNew || !!editing;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="text-sm text-white/50">{songs.length} tracks</div>
        <Button onClick={() => { setEditing(null); setForm({ title: "", genre: "Hip-Hop / Dancehall Fusion", priceUsd: "1.99", description: "", lyrics: "", isFree: false, isPublished: true, coverUrl: "", audioFullPath: "", audioPreviewPath: "" }); setShowNew(true); }}>+ New song</Button>
      </div>
      <div className="mt-4 space-y-2">
        {songs.map((s) => (
          <div key={s.id as string} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
            <div className="h-12 w-12 rounded-xl overflow-hidden bg-white/10 shrink-0">{s.coverUrl ? <img src={s.coverUrl as string} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full grid place-items-center">♪</div>}</div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-semibold">{s.title as string} <span className="text-white/30 font-normal">/{s.slug as string}</span></div>
              <div className="text-[11px] text-white/45">{s.genre as string} • ${String(s.priceUsd)} {s.isFree ? "• FREE" : ""} • {s.isPublished ? "● Published" : "○ Draft"} • {String(s.playCount || 0)} plays</div>
            </div>
            <button onClick={() => { setForm({ ...s }); setEditing(s); }} className="rounded-full border border-white/10 px-4 py-1.5 text-xs hover:border-[#D4AF37]/60">Edit</button>
            <button onClick={() => del(s.id as string)} className="rounded-full border border-red-500/30 px-4 py-1.5 text-xs text-red-300">Del</button>
          </div>
        ))}
        {songs.length === 0 && <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-white/40">No songs yet — create your first single above.</div>}
      </div>

      <Modal open={open} onClose={() => { setShowNew(false); setEditing(null); }} wide>
        <div className="text-[11px] uppercase tracking-[0.24em] text-[#D4AF37] font-bold">{editing ? "Edit song" : "New song"}</div>
        <h3 className="font-display text-2xl mt-1">Track details</h3>
        <div className="mt-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="text-xs text-white/50">Title *</label><div className="mt-1"><Input value={String(form.title || "")} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Midnight in Kampala" /></div></div>
            <div>
              <label className="text-xs text-white/50">Genre</label>
              <div className="mt-1 flex gap-2">
                <select
                  value={["Hip-Hop / Dancehall Fusion", "Hip-Hop", "Dancehall", "Afrobeats", "Reggae", "R&B", "Pop", "Trap", "Drill", "Gospel"].includes(String(form.genre || "")) ? String(form.genre || "") : "custom"}
                  onChange={(e) => {
                    if (e.target.value !== "custom") setForm({ ...form, genre: e.target.value });
                  }}
                  className="rounded-xl border border-white/10 bg-[#161411] px-3 py-2 text-sm outline-none focus:border-[#D4AF37]/60"
                >
                  <option value="Hip-Hop / Dancehall Fusion">Hip-Hop / Dancehall Fusion</option>
                  <option value="Hip-Hop">Hip-Hop</option>
                  <option value="Dancehall">Dancehall</option>
                  <option value="Afrobeats">Afrobeats</option>
                  <option value="Reggae">Reggae</option>
                  <option value="R&B">R&B</option>
                  <option value="Pop">Pop</option>
                  <option value="Trap">Trap</option>
                  <option value="Drill">Drill</option>
                  <option value="Gospel">Gospel</option>
                  <option value="custom">Custom (type below)</option>
                </select>
                <Input value={String(form.genre || "")} onChange={(e) => setForm({ ...form, genre: e.target.value })} placeholder="Or type your own genre" />
              </div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="text-xs text-white/50">Price USD (change anytime)</label><div className="mt-1"><Input value={String(form.priceUsd || "")} onChange={(e) => setForm({ ...form, priceUsd: e.target.value })} type="number" step="0.01" /></div></div>
            <div className="flex items-end gap-4 pb-3 text-sm">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!form.isFree} onChange={(e) => setForm({ ...form, isFree: e.target.checked })} className="accent-[#D4AF37] h-4 w-4" /> Free</label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isPublished !== false} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} className="accent-[#D4AF37] h-4 w-4" /> Published</label>
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50">Cover art</label>
            <div className="mt-1 flex gap-2">
              <Input value={String(form.coverUrl || "")} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} placeholder="https://… or upload" />
              <label className="shrink-0 cursor-pointer rounded-xl border border-white/10 px-4 py-3 text-xs hover:border-[#D4AF37]/60">{uploading === "cover" ? "…" : "Upload"}<input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const url = await uploadFile(f, "cover"); if (url) setForm((p) => ({ ...p, coverUrl: url })); } }} /></label>
            </div>
            {form.coverUrl ? <img src={String(form.coverUrl)} alt="" className="mt-2 h-20 w-20 rounded-xl object-cover" /> : null}
          </div>
          <div>
            <label className="text-xs text-white/50">Full audio (private after upload)</label>
            <div className="mt-1 flex gap-2">
              <Input value={String(form.audioFullPath || "")} onChange={(e) => setForm({ ...form, audioFullPath: e.target.value })} placeholder="Private audio upload" />
              <label className="shrink-0 cursor-pointer rounded-xl border border-white/10 px-4 py-3 text-xs hover:border-[#D4AF37]/60">{uploading === "audio" ? "Uploading…" : "Upload"}<input type="file" accept="audio/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const url = await uploadFile(f, "audio"); if (url) setForm((p) => ({ ...p, audioFullPath: url })); } }} /></label>
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50">Preview clip (public; upload a preview, not the full track)</label>
            <div className="mt-1 flex gap-2">
              <Input value={String(form.audioPreviewPath || "")} onChange={(e) => setForm({ ...form, audioPreviewPath: e.target.value })} placeholder="/uploads/audio/preview…" />
              <label className="shrink-0 cursor-pointer rounded-xl border border-white/10 px-4 py-3 text-xs hover:border-[#D4AF37]/60">Upload<input type="file" accept="audio/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const url = await uploadFile(f, "preview"); if (url) setForm((p) => ({ ...p, audioPreviewPath: url })); } }} /></label>
            </div>
          </div>
          <div><label className="text-xs text-white/50">Description</label><div className="mt-1"><Textarea value={String(form.description || "")} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Story behind the song…" /></div></div>
          <div><label className="text-xs text-white/50">Lyrics</label><div className="mt-1"><Textarea value={String(form.lyrics || "")} onChange={(e) => setForm({ ...form, lyrics: e.target.value })} placeholder="Verse 1…" /></div></div>
          <Button onClick={save} className="w-full">{editing ? "Save changes (live immediately)" : "Publish song"}</Button>
        </div>
      </Modal>
    </div>
  );
}

function SalesTab({ stats }: { stats: Record<string, unknown> | null }) {
  const rows = ((stats?.recentPurchases as Record<string, unknown>[]) || []);
  async function setFulfillment(id: string, status: string) {
    const response = await fetch(`/api/admin/merch-orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (!response.ok) push("Could not update order", "error"); else push("Order updated", "success");
  }
  const { push } = useToast();
  function csv() {
    const head = "id,item,email,amount,currency,payment_status,fulfillment_status,delivery_name,delivery_phone,delivery_address,date\n";
    const body = rows.map((r) => [r.id, r.merchTitle || (r.songId ? "Song" : r.albumId ? "Album" : r.videoId ? "Video" : ""), r.buyerEmail, r.amount, r.currency, r.status, r.fulfillmentStatus, r.shippingName, r.shippingPhone, r.shippingAddress, r.createdAt].map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([head + body], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sales.csv";
    a.click();
  }
  return (
    <div>
      <div className="flex items-center justify-between"><div className="text-sm text-white/50">{rows.length} recent purchases</div><Button variant="ghost" onClick={csv}>⬇ Export CSV</Button></div>
      <div className="glass-surface mt-3 overflow-x-auto rounded-2xl">
        <table className="w-full text-xs min-w-[980px]">
          <thead><tr className="text-left text-white/40 border-b border-white/10"><th className="p-3">Item / delivery</th><th className="p-3">Buyer</th><th className="p-3">Amount</th><th className="p-3">Payment</th><th className="p-3">Fulfillment</th><th className="p-3">Date</th></tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i} className="border-b border-white/[0.05]"><td className="p-3"><strong>{String(r.merchTitle || (r.songId ? "Song purchase" : r.albumId ? "Album purchase" : r.videoId ? "Video purchase" : "Purchase"))}</strong>{Boolean(r.merchProductId) && <div className="mt-1 text-white/50">{String(r.merchSize)} · {String(r.shippingName)}<br />{String(r.shippingPhone)} · {String(r.shippingAddress)}</div>}</td><td className="p-3">{String(r.buyerEmail)}</td><td className="p-3">{String(r.amount)} {String(r.currency)}</td><td className="p-3"><span className={`rounded-full px-2 py-0.5 ${r.status === "completed" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>{String(r.status)}</span></td><td className="p-3">{Boolean(r.merchProductId) ? <select value={String(r.fulfillmentStatus || "unfulfilled")} onChange={(e) => void setFulfillment(String(r.id), e.target.value)} className="rounded-lg border border-white/10 bg-black/30 px-2 py-1">{["unfulfilled", "processing", "shipped", "delivered", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}</select> : "—"}</td><td className="p-3 text-white/40">{String(r.createdAt || "").slice(0, 16).replace("T", " ")}</td></tr>)}</tbody>
        </table>
        {rows.length === 0 && <div className="p-8 text-center text-white/40 text-sm">No sales yet — share your music link!</div>}
      </div>
    </div>
  );
}

function DonationsTab({ stats }: { stats: Record<string, unknown> | null }) {
  const rows = ((stats?.recentDonations as Record<string, unknown>[]) || []);
  return (
    <div>
      <div className="text-sm text-white/50">Total: <strong className="text-[#D4AF37]">${Number((stats?.donationTotal as number) || 0).toFixed(2)}</strong></div>
      <div className="mt-3 space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="clay-surface flex items-center justify-between rounded-2xl p-3 text-sm">
            <div><strong>{String(r.isAnonymous ? "Anonymous" : r.donorName)}</strong><div className="text-xs text-white/45">{String(r.message || "")}</div></div>
            <div className="text-right"><div className="font-bold text-[#D4AF37]">${String(r.amount)}</div><div className="text-[11px] text-white/40">{String(r.status)}</div></div>
          </div>
        ))}
        {rows.length === 0 && <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/40">No donations yet.</div>}
      </div>
    </div>
  );
}

function CommentsTab({ comments, onReload, push }: { comments: Record<string, unknown>[]; onReload: () => void; push: (m: string, k?: "success" | "error" | "info") => void }) {
  const [reply, setReply] = useState("");
  async function act(id: string, body: Record<string, unknown>) {
    const r = await fetch(`/api/comments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.ok) { push("Done ✓", "success"); onReload(); } else push("Failed", "error");
  }
  async function del(id: string) {
    if (!confirm("Delete?")) return;
    await fetch(`/api/comments/${id}`, { method: "DELETE" });
    onReload();
  }
  return (
    <div className="space-y-2">
      {comments.map((c) => (
        <div key={c.id as string} className="glass-surface rounded-2xl p-4 text-sm">
          <div className="flex items-center gap-2"><strong>{String(c.authorName)}</strong>{c.isArtistReply ? <Badge>Artist</Badge> : null}<span className={`text-[11px] rounded-full px-2 py-0.5 ${c.isApproved ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>{c.isApproved ? "visible" : "hidden"}</span><span className="text-[11px] text-white/30 ml-auto">{String(c.createdAt || "").slice(0, 16).replace("T", " ")}</span></div>
          <p className="mt-1 text-white/75">{String(c.body)}</p>
          {(c.replies as Record<string, unknown>[] | undefined)?.map((r) => <div key={r.id as string} className="ml-4 mt-2 border-l border-white/10 pl-3 text-[13px]"><strong>{String(r.authorName)}</strong> {r.isArtistReply ? "✓ " : ""}— {String(r.body)}</div>)}
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <button onClick={() => act(c.id as string, { isApproved: !(c.isApproved as boolean) })} className="rounded-full border border-white/10 px-3 py-1.5">{c.isApproved ? "Hide" : "Approve"}</button>
            <button onClick={() => del(c.id as string)} className="rounded-full border border-red-500/30 px-3 py-1.5 text-red-300">Delete</button>
            <div className="flex gap-1 flex-1 min-w-[200px]">
              <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply as artist…" className="flex-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs outline-none" />
              <button onClick={() => { act(c.id as string, { action: "reply", body: reply }); setReply(""); }} className="rounded-full bg-[#D4AF37] px-3 py-1.5 text-black font-bold">↩</button>
            </div>
          </div>
        </div>
      ))}
      {comments.length === 0 && <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/40">No comments yet.</div>}
    </div>
  );
}

function MerchTab({ items, uploadFile, uploading, onReload, push }: {
  items: Record<string, unknown>[];
  uploadFile: (file: File, kind: string) => Promise<string | null>;
  uploading: string;
  onReload: () => void;
  push: (message: string, type?: "success" | "error" | "info") => void;
}) {
  const empty = { title: "", category: "cap", description: "", priceUsd: "25.00", imageUrl: "", availableSizes: "One size", isPublished: true };
  const [form, setForm] = useState<Record<string, unknown>>(empty);
  const [editingId, setEditingId] = useState("");
  function edit(item?: Record<string, unknown>) {
    setEditingId(String(item?.id || ""));
    setForm(item ? { ...item, availableSizes: Array.isArray(item.availableSizes) ? item.availableSizes.join(", ") : "One size" } : { ...empty });
  }
  async function save() {
    const body = { ...form, availableSizes: String(form.availableSizes || "One size").split(",").map((s) => s.trim()).filter(Boolean) };
    const response = await fetch(editingId ? `/api/catalog/merch/${editingId}` : "/api/catalog/merch", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) { push(result.error || "Could not save item", "error"); return; }
    push("Merch item saved", "success"); edit(); onReload();
  }
  async function remove(id: string) { if (!confirm("Delete this merch item? Paid orders prevent deletion.")) return; const r = await fetch(`/api/catalog/merch/${id}`, { method: "DELETE" }); if (!r.ok) push("This item may have existing orders; unpublish it instead.", "error"); onReload(); }
  return <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
    <Card className="p-5"><h2 className="font-display text-2xl">{editingId ? "Edit" : "Add"} merch</h2><div className="mt-4 space-y-3">
      <Input placeholder="Product name" value={String(form.title || "")} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <select value={String(form.category)} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm"><option value="cap">Cap</option><option value="tshirt">T-shirt</option><option value="hoodie">Hoodie</option></select>
      <Textarea placeholder="Product description" value={String(form.description || "")} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <Input type="number" min="0.01" step="0.01" placeholder="Price in USD" value={String(form.priceUsd || "")} onChange={(e) => setForm({ ...form, priceUsd: e.target.value })} />
      <Input placeholder="Available sizes, comma separated" value={String(form.availableSizes || "")} onChange={(e) => setForm({ ...form, availableSizes: e.target.value })} />
      <div className="flex flex-wrap items-center gap-3"><Input placeholder="Product image URL" value={String(form.imageUrl || "")} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
        <label className="shrink-0 cursor-pointer rounded-xl border border-white/10 px-4 py-3 text-xs hover:border-[#D4AF37]/60">{uploading === "cover" ? "Uploading…" : "Upload image"}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { const url = await uploadFile(file, "cover"); if (url) setForm((prev) => ({ ...prev, imageUrl: url })); } e.currentTarget.value = ""; }} /></label>
      </div>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} /> Published in the public store</label>
      <div className="flex gap-2"><Button disabled={!String(form.title || "").trim() || !String(form.imageUrl || "").trim()} onClick={save}>{editingId ? "Update item" : "Save item"}</Button>{editingId && <Button variant="ghost" onClick={() => edit()}>Cancel</Button>}</div>
    </div></Card>
    <div className="space-y-2">{items.map((item) => <div key={String(item.id)} className="glass-surface flex items-center gap-3 rounded-xl p-3"><img src={String(item.imageUrl)} alt="" className="h-16 w-16 rounded-lg object-cover" /><div className="min-w-0 flex-1"><strong>{String(item.title)}</strong><div className="text-xs capitalize text-white/45">{String(item.category)} · ${String(item.priceUsd)} · {item.isPublished ? "Published" : "Hidden"}</div></div><Button variant="ghost" onClick={() => edit(item)}>Edit</Button><Button variant="ghost" onClick={() => remove(String(item.id))}>Delete</Button></div>)}{!items.length && <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/40">No merch listed yet.</div>}</div>
  </div>;
}

function CatalogTab({ kind, items, uploadFile, uploading, onReload, push }: {
  kind: "albums" | "videos";
  items: Record<string, unknown>[];
  uploadFile: (file: File, kind: string) => Promise<string | null>;
  uploading: string;
  onReload: () => void;
  push: (message: string, type?: "success" | "error" | "info") => void;
}) {
  const album = kind === "albums";
  const [form, setForm] = useState<Record<string, unknown>>({ title: "", description: "", priceUsd: album ? "9.99" : "1.99", coverUrl: "", archivePath: "", previewPath: "", videoFullPath: "", videoPreviewPath: "", isFree: false, isPublished: true });
  const [editingId, setEditingId] = useState("");
  const fullKey = album ? "archivePath" : "videoFullPath";
  const previewKey = album ? "previewPath" : "videoPreviewPath";
  function select(item?: Record<string, unknown>) {
    setEditingId(String(item?.id || ""));
    setForm(item ? { ...item } : { title: "", description: "", priceUsd: album ? "9.99" : "1.99", coverUrl: "", archivePath: "", previewPath: "", videoFullPath: "", videoPreviewPath: "", isFree: false, isPublished: true });
  }
  async function submit() {
    const response = await fetch(editingId ? `/api/catalog/${kind}/${editingId}` : `/api/catalog/${kind}`, { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const result = await response.json();
    if (!response.ok) { push(result.error || "Save failed", "error"); return; }
    push("Saved ✓", "success"); select(); onReload();
  }
  async function remove(id: string) { if (!confirm("Delete this item?")) return; await fetch(`/api/catalog/${kind}/${id}`, { method: "DELETE" }); onReload(); }
  const fileInput = (label: string, uploadKind: string, key: string, accept: string) => <label className="cursor-pointer rounded-xl border border-white/10 px-4 py-3 text-xs hover:border-[#D4AF37]/60">{uploading === uploadKind ? "Uploading…" : `${label}${form[key] ? " ✓" : ""}`}<input type="file" accept={accept} className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const path = await uploadFile(file, uploadKind); if (path) setForm((prev) => ({ ...prev, [key]: path })); e.currentTarget.value = ""; }} /></label>;
  return <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
    <Card className="p-5"><h2 className="font-display text-2xl">{editingId ? "Edit" : "Add"} {album ? "album" : "download video"}</h2>
      <div className="mt-4 space-y-3"><Input placeholder="Title" value={String(form.title || "")} onChange={(e) => setForm({ ...form, title: e.target.value })} /><Textarea placeholder="Description" value={String(form.description || "")} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Input placeholder="Price in USD" type="number" min="0" step="0.01" value={String(form.priceUsd || "")} onChange={(e) => setForm({ ...form, priceUsd: e.target.value })} />
        <Input placeholder="Cover image URL (or upload below)" value={String(form.coverUrl || "")} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} />
        <div className="flex flex-wrap gap-2">{fileInput("Upload cover", "cover", "coverUrl", "image/*")}{album ? fileInput("Upload private ZIP archive", "album", fullKey, ".zip,application/zip") : fileInput("Upload private full video", "video", fullKey, "video/mp4,video/webm,video/quicktime")}{fileInput(album ? "Upload public audio preview" : "Upload public video preview", album ? "preview" : "video-preview", previewKey, album ? "audio/*" : "video/mp4,video/webm,video/quicktime")}</div>
        <div className="flex gap-4 text-xs"><label><input type="checkbox" checked={!!form.isFree} onChange={(e) => setForm({ ...form, isFree: e.target.checked })} /> Free</label><label><input type="checkbox" checked={!!form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} /> Published</label></div>
        <div className="flex gap-2"><Button onClick={submit} disabled={!String(form.title || "").trim()}>{editingId ? "Update" : "Save"}</Button>{editingId && <Button variant="ghost" onClick={() => select()}>Cancel</Button>}</div>
        <p className="text-[11px] text-white/40">Private full files require matching private Tigris bucket credentials. Preview files are public.</p>
      </div>
    </Card>
    <div className="space-y-2">{items.map((item) => <div key={String(item.id)} className="glass-surface flex items-center justify-between gap-3 rounded-xl p-4"><div><strong>{String(item.title)}</strong><div className="text-xs text-white/45">{item.isPublished ? "Published" : "Draft"} · {item.isFree ? "Free" : `$${String(item.priceUsd)}`}</div></div><div className="flex gap-2"><Button variant="ghost" onClick={() => select(item)}>Edit</Button><Button variant="ghost" onClick={() => remove(String(item.id))}>Delete</Button></div></div>)}{!items.length && <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/40">No {kind} yet. Add one here.</div>}</div>
  </div>;
}

function PortfolioTab({ portfolio, onReload, uploadFile, push }: {
  portfolio: { milestones: unknown[]; gallery: unknown[]; videos: unknown[]; press: unknown[] };
  onReload: () => void;
  uploadFile: (f: File, kind: string) => Promise<string | null>;
  push: (m: string, k?: "success" | "error" | "info") => void;
}) {
  const [mForm, setMForm] = useState({ year: "2026", title: "", description: "" });
  const [vForm, setVForm] = useState({ youtubeId: "", title: "" });
  const [pForm, setPForm] = useState({ outlet: "", quote: "", author: "" });

  async function add(kind: string, data: Record<string, unknown>) {
    const r = await fetch("/api/portfolio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, ...data }) });
    if (r.ok) { push("Added ✓", "success"); onReload(); } else push("Failed", "error");
  }
  async function del(kind: string, id: string) {
    if (!confirm("Delete?")) return;
    await fetch(`/api/portfolio?kind=${kind}&id=${id}`, { method: "DELETE" });
    onReload();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <div className="font-bold text-sm">Milestones ({(portfolio.milestones as unknown[]).length})</div>
        <div className="mt-2 flex gap-2"><Input value={mForm.year} onChange={(e) => setMForm({ ...mForm, year: e.target.value })} placeholder="Year" /><Input value={mForm.title} onChange={(e) => setMForm({ ...mForm, title: e.target.value })} placeholder="Title" /></div>
        <div className="mt-2"><Input value={mForm.description} onChange={(e) => setMForm({ ...mForm, description: e.target.value })} placeholder="Description" /></div>
        <Button variant="ghost" onClick={() => add("milestone", mForm)} className="mt-2 !py-2 text-xs">+ Add milestone</Button>
        <div className="mt-3 space-y-1 text-xs">{(portfolio.milestones as Record<string, unknown>[]).map((m) => <div key={m.id as string} className="flex justify-between border-b border-white/[0.06] py-1.5"><span>{String(m.year)} — {String(m.title)}</span><button onClick={() => del("milestone", m.id as string)} className="text-red-300">✕</button></div>)}</div>
      </Card>
      <Card>
        <div className="font-bold text-sm">Videos ({(portfolio.videos as unknown[]).length})</div>
        <div className="mt-2 flex gap-2"><Input value={vForm.youtubeId} onChange={(e) => setVForm({ ...vForm, youtubeId: e.target.value })} placeholder="YouTube ID" /><Input value={vForm.title} onChange={(e) => setVForm({ ...vForm, title: e.target.value })} placeholder="Title" /></div>
        <Button variant="ghost" onClick={() => add("video", vForm)} className="mt-2 !py-2 text-xs">+ Add video</Button>
        <div className="mt-3 space-y-1 text-xs">{(portfolio.videos as Record<string, unknown>[]).map((v) => <div key={v.id as string} className="flex justify-between border-b border-white/[0.06] py-1.5"><span>{String(v.title)}</span><button onClick={() => del("video", v.id as string)} className="text-red-300">✕</button></div>)}</div>
      </Card>
      <Card>
        <div className="font-bold text-sm">Gallery ({(portfolio.gallery as unknown[]).length})</div>
        <label className="mt-2 block cursor-pointer rounded-xl border border-dashed border-white/15 p-4 text-center text-xs hover:border-[#D4AF37]/50">📤 Upload photo<input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const url = await uploadFile(f, "image"); if (url) add("gallery", { imageUrl: url, caption: f.name }); } }} /></label>
        <div className="mt-3 grid grid-cols-4 gap-2">{(portfolio.gallery as Record<string, unknown>[]).map((g) => <div key={g.id as string} className="relative group"><img src={String(g.imageUrl)} alt="" className="aspect-square rounded-lg object-cover" /><button onClick={() => del("gallery", g.id as string)} className="absolute top-1 right-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-red-300 opacity-0 group-hover:opacity-100">✕</button></div>)}</div>
      </Card>
      <Card>
        <div className="font-bold text-sm">Press ({(portfolio.press as unknown[]).length})</div>
        <div className="mt-2 flex gap-2"><Input value={pForm.outlet} onChange={(e) => setPForm({ ...pForm, outlet: e.target.value })} placeholder="Outlet" /><Input value={pForm.author} onChange={(e) => setPForm({ ...pForm, author: e.target.value })} placeholder="Author" /></div>
        <div className="mt-2"><Textarea value={pForm.quote} onChange={(e) => setPForm({ ...pForm, quote: e.target.value })} placeholder="Quote…" /></div>
        <Button variant="ghost" onClick={() => add("press", pForm)} className="mt-2 !py-2 text-xs">+ Add press</Button>
        <div className="mt-3 space-y-1 text-xs">{(portfolio.press as Record<string, unknown>[]).map((p) => <div key={p.id as string} className="flex justify-between border-b border-white/[0.06] py-1.5"><span className="truncate mr-2">{String(p.outlet)} — “{String(p.quote).slice(0, 50)}”</span><button onClick={() => del("press", p.id as string)} className="text-red-300">✕</button></div>)}</div>
      </Card>
    </div>
  );
}

function SettingsTab({ settings, setSettings, songs, uploadFile, push }: {
  settings: Record<string, unknown>;
  setSettings: (v: Record<string, unknown>) => void;
  songs: Record<string, unknown>[];
  uploadFile: (f: File, kind: string) => Promise<string | null>;
  push: (m: string, k?: "success" | "error" | "info") => void;
}) {
  async function save() {
    const r = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
    if (r.ok) push("Settings live ✓", "success");
    else push("Save failed", "error");
  }
  const social = (settings.socialLinks as Record<string, string>) || {};
  const streams = (settings.streamingLinks as Record<string, string>) || {};
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <div className="font-bold text-sm">Artist profile</div>
        <div className="mt-3 space-y-3">
          <div><label className="text-xs text-white/50">Artist name</label><div className="mt-1"><Input value={String(settings.artistName || "")} onChange={(e) => setSettings({ ...settings, artistName: e.target.value })} /></div></div>
          <div><label className="text-xs text-white/50">Tagline</label><div className="mt-1"><Input value={String(settings.tagline || "")} onChange={(e) => setSettings({ ...settings, tagline: e.target.value })} /></div></div>
          <div><label className="text-xs text-white/50">Hero text</label><div className="mt-1"><Textarea value={String(settings.heroText || "")} onChange={(e) => setSettings({ ...settings, heroText: e.target.value })} /></div></div>
          <div><label className="text-xs text-white/50">Bio</label><div className="mt-1"><Textarea value={String(settings.bio || "")} onChange={(e) => setSettings({ ...settings, bio: e.target.value })} /></div></div>
          <div>
            <label className="text-xs text-white/50">Hero image</label>
            <div className="mt-1 flex gap-2">
              <Input value={String(settings.heroImageUrl || "")} onChange={(e) => setSettings({ ...settings, heroImageUrl: e.target.value })} placeholder="Image URL or upload" />
              <label className="shrink-0 cursor-pointer rounded-xl border border-white/10 px-4 py-3 text-xs hover:border-[#D4AF37]/60">Upload<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const url = await uploadFile(f, "hero"); if (url) setSettings({ ...settings, heroImageUrl: url }); } }} /></label>
            </div>
          </div>
          <div><label className="text-xs text-white/50">Featured song</label><select value={String(settings.featuredSongId || "")} onChange={(e) => setSettings({ ...settings, featuredSongId: e.target.value || null })} className="mt-1 w-full rounded-xl border border-white/10 bg-[#161411] px-4 py-3 text-sm"><option value="">Auto (latest)</option>{songs.map((s) => <option key={s.id as string} value={s.id as string}>{String(s.title)}</option>)}</select></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!settings.approvalRequired} onChange={(e) => setSettings({ ...settings, approvalRequired: e.target.checked })} className="accent-[#D4AF37] h-4 w-4" /> Require approval for new comments</label>
        </div>
      </Card>
      <div className="space-y-4">
        <Card>
          <div className="font-bold text-sm">Social links</div>
          <div className="mt-3 grid grid-cols-2 gap-2">{["instagram", "tiktok", "youtube", "x", "facebook", "spotify", "whatsapp", ...Object.keys(social).filter(k => !["instagram", "tiktok", "youtube", "x", "facebook", "spotify", "whatsapp"].includes(k))].map((k) => <div key={k} className="flex gap-1"><div className="flex-1"><label className="text-[11px] text-white/50 capitalize">{k}</label><Input value={social[k] || ""} onChange={(e) => setSettings({ ...settings, socialLinks: { ...social, [k]: e.target.value } })} placeholder={`https://…`} /></div><button onClick={() => { const newSocial = { ...social }; delete newSocial[k]; setSettings({ ...settings, socialLinks: newSocial }); }} className="self-end mb-1 rounded-full border border-red-500/30 px-2 py-1.5 text-xs text-red-300">✕</button></div>)}</div>
          <button onClick={() => { const name = prompt("Enter platform name (e.g. SoundCloud, Bandcamp):"); if (name) setSettings({ ...settings, socialLinks: { ...social, [name.toLowerCase()]: "" } }); }} className="mt-2 rounded-full border border-[#D4AF37]/40 px-3 py-1.5 text-xs text-[#D4AF37] hover:bg-[#D4AF37]/10">+ Add social link</button>
        </Card>
        <Card>
          <div className="font-bold text-sm">Streaming links</div>
          <div className="mt-3 grid grid-cols-2 gap-2">{["spotify", "spotifyApp", "apple", "itunes", "youtube", "audiomack", "boomplay", ...Object.keys(streams).filter(k => !["spotify", "spotifyApp", "apple", "itunes", "youtube", "audiomack", "boomplay"].includes(k))].map((k) => <div key={k} className="flex gap-1"><div className="flex-1"><label className="text-[11px] text-white/50 capitalize">{k === "spotifyApp" ? "Spotify app link" : k === "apple" ? "Apple Music" : k === "itunes" ? "iTunes Store" : k}</label><Input value={streams[k] || ""} onChange={(e) => setSettings({ ...settings, streamingLinks: { ...streams, [k]: e.target.value } })} placeholder={k === "spotifyApp" ? "spotify:album:…" : "https://…"} /></div><button onClick={() => { const newStreams = { ...streams }; delete newStreams[k]; setSettings({ ...settings, streamingLinks: newStreams }); }} className="self-end mb-1 rounded-full border border-red-500/30 px-2 py-1.5 text-xs text-red-300">✕</button></div>)}</div>
          <button onClick={() => { const name = prompt("Enter streaming platform name (e.g. Tidal, Deezer, Bandcamp):"); if (name) setSettings({ ...settings, streamingLinks: { ...streams, [name.toLowerCase()]: "" } }); }} className="mt-2 rounded-full border border-[#D4AF37]/40 px-3 py-1.5 text-xs text-[#D4AF37] hover:bg-[#D4AF37]/10">+ Add streaming link</button>
        </Card>
        <Button onClick={save} className="w-full">Save all settings (live immediately)</Button>
        <Card><div className="font-bold text-sm">Payment provider</div><p className="mt-1 text-xs text-white/45">Flutterwave is configured for hosted checkout. Add its server secrets and webhook hash to the deployment environment.</p><div className="mt-2 inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">● Flutterwave</div></Card>
      </div>
    </div>
  );
}
