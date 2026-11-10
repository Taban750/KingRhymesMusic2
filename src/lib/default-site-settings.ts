import { DEFAULT_HERO_IMAGE, DEFAULT_SOCIAL_LINKS, DEFAULT_STREAMING_LINKS } from "@/lib/site-content";

export const DEFAULT_SETTINGS = {
  artistName: "KING RHYMES",
  tagline: "Where Rhymes Reign",
  heroText: "Ugandan hip-hop / dancehall-hip-hop fusion with street-culture swagger and a premium crown. Stream previews free, own the full masters in high quality.",
  bio: "King Rhymes is an independent Ugandan hip-hop / dancehall fusion artist from Kampala — bold, regal, urban and premium. Fusing hard hip-hop bars with dancehall energy, every stream, purchase and donation goes straight back into the next record: no label, no middlemen. Where Rhymes Reign.",
  heroImageUrl: DEFAULT_HERO_IMAGE,
  featuredSongId: null as string | null,
  socialLinks: DEFAULT_SOCIAL_LINKS,
  streamingLinks: DEFAULT_STREAMING_LINKS,
  paymentMethods: ["flutterwave"],
  currencies: ["USD", "UGX", "KES", "NGN", "GBP", "EUR"],
  approvalRequired: false,
  pressKitUrl: "",
};
