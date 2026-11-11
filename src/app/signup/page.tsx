"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Input, Button } from "@/components/ui";
import { useToast } from "@/components/providers";
import { SocialAuthButtons } from "@/components/social-auth-buttons";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminSetupToken, setAdminSetupToken] = useState("");
  const [loading, setLoading] = useState(false);
  const { push } = useToast();
  const router = useRouter();

  async function submit() {
    if (!name.trim()) return push("Enter a display name", "error");
    if (password.length < 12) return push("Password must be at least 12 characters", "error");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: name, email, password, adminSetupToken }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Signup failed");
      push(j.emailConfirmationRequired ? "Check your email to confirm your account." : `Karibu, ${j.user.displayName}!`, j.emailConfirmationRequired ? "info" : "success");
      router.push(j.emailConfirmationRequired ? "/login" : j.user.role === "admin" ? "/admin" : "/music");
      router.refresh();
    } catch (e: unknown) {
      push(e instanceof Error ? e.message : "Failed", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-14">
      <div className="text-center"><div className="text-[11px] uppercase tracking-[0.28em] text-[#D4AF37] font-bold">Optional fan account</div><h1 className="font-display text-4xl mt-2">Sign up</h1><p className="mt-2 text-sm text-white/50">Browse music, albums, videos, and merch without an account. Signing up is optional; you can use a fan account for comments, ratings, and purchase receipts. To receive new release and product updates, subscribe by email in the footer—no account needed.</p></div>
      <Card className="mt-6 space-y-3">
        <div><label className="text-xs text-white/50">Display name</label><div className="mt-1"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sarah K." /></div></div>
        <div><label className="text-xs text-white/50">Email</label><div className="mt-1"><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" /></div></div>
        <div><label className="text-xs text-white/50">Password (min 12)</label><div className="mt-1"><Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="12 characters or more" type="password" minLength={12} maxLength={128} /></div></div>
        <div><label className="text-xs text-white/50">Admin setup token (artist account only)</label><div className="mt-1"><Input value={adminSetupToken} onChange={(e) => setAdminSetupToken(e.target.value)} type="password" autoComplete="off" /></div></div>
        <Button onClick={submit} disabled={loading} className="w-full">{loading ? "Creating account…" : "Create account"}</Button>
        <div className="pt-1"><SocialAuthButtons nextPath="/music" /></div>
        <p className="text-center text-xs text-white/50">Have an account? <Link href="/login" className="text-[#D4AF37] hover:underline">Log in</Link></p>
      </Card>
    </div>
  );
}
