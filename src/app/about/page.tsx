import { db } from "@/db";
import { siteSettings, milestones } from "@/db/schema";
import AboutClient from "./about-client";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  let settings: Record<string, unknown> = {};
  let miles: { year: string; title: string; description?: string | null }[] = [];
  try {
    const s = await db.select().from(siteSettings);
    if (s[0]) settings = s[0] as unknown as Record<string, unknown>;
  } catch {}
  try {
    miles = await db.select().from(milestones);
  } catch {}
  return <AboutClient settings={settings} milestones={miles} />;
}
