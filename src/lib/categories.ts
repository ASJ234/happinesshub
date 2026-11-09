import type { SupabaseClient } from "@supabase/supabase-js";

export type CategoryKind = "video" | "listing";
export type CategoryAccess = "free" | "paid";
export type CategoryAspect = "9:16";

export interface CategoryDefinition {
  slug: string;
  label: string;
  description: string;
  kind: CategoryKind;
  access: CategoryAccess;
  /** Required aspect ratio for uploads. `null` means unconstrained. */
  aspect: CategoryAspect | null;
  /** Maximum upload duration in seconds. `null` means unconstrained. */
  maxSeconds: number | null;
  requiresVerification: boolean;
  href: string;
  sortOrder: number;
}

/**
 * The ten HAPPYPORN.COM sectors.
 *
 * This static list is the canonical source for navigation, labels and the
 * fallback paywall rules. The `public.categories` table mirrors it and lets an
 * admin flip a sector between free and paid without a redeploy; when that
 * table is missing the static rules below apply.
 */
export const CATEGORIES: readonly CategoryDefinition[] = [
  {
    slug: "picha",
    label: "Picha",
    description: "Photo galleries and picture collections",
    kind: "listing",
    access: "free",
    aspect: null,
    maxSeconds: null,
    requiresVerification: false,
    href: "/dashboard/picha",
    sortOrder: 10,
  },
  {
    slug: "wardrobe",
    label: "Wardrobe",
    description: "Merchants selling sex toys",
    kind: "listing",
    access: "free",
    aspect: null,
    maxSeconds: null,
    requiresVerification: false,
    href: "/dashboard/wardrobe",
    sortOrder: 30,
  },
  {
    slug: "ugandan",
    label: "Exclusively Ugandan",
    description: "Only Ugandan-made videos",
    kind: "video",
    access: "paid",
    aspect: null,
    maxSeconds: null,
    requiresVerification: false,
    href: "/dashboard/ugandan",
    sortOrder: 40,
  },
  {
    slug: "appetizers",
    label: "Appetizers",
    description: "Appetizing vertical videos",
    kind: "video",
    access: "paid",
    aspect: "9:16",
    maxSeconds: 300,
    requiresVerification: false,
    href: "/dashboard/appetizers",
    sortOrder: 50,
  },
  {
    slug: "quickies",
    label: "Quickies",
    description: "Short vertical videos",
    kind: "video",
    access: "paid",
    aspect: "9:16",
    maxSeconds: 120,
    requiresVerification: false,
    href: "/dashboard/quickies",
    sortOrder: 60,
  },
  {
    slug: "masseuse",
    label: "Masseuse",
    description: "Massage ladies available to hire",
    kind: "listing",
    access: "free",
    aspect: null,
    maxSeconds: null,
    requiresVerification: true,
    href: "/dashboard/masseuse",
    sortOrder: 70,
  },
  {
    slug: "hookups",
    label: "Hookups",
    description: "Companions available to book",
    kind: "listing",
    access: "free",
    aspect: null,
    maxSeconds: null,
    requiresVerification: true,
    href: "/dashboard/hookups",
    sortOrder: 80,
  },
  {
    slug: "live",
    label: "Live",
    description: "Live streams and their recordings",
    kind: "video",
    access: "paid",
    aspect: null,
    maxSeconds: null,
    requiresVerification: false,
    href: "/dashboard/live",
    sortOrder: 90,
  },
  {
    slug: "explore",
    label: "Explore",
    description: "Every video on the platform",
    kind: "video",
    access: "paid",
    aspect: null,
    maxSeconds: null,
    requiresVerification: false,
    href: "/dashboard/explore",
    sortOrder: 100,
  },
];

const BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

export const VIDEO_CATEGORIES = CATEGORIES.filter((c) => c.kind === "video");
export const LISTING_CATEGORIES = CATEGORIES.filter((c) => c.kind === "listing");

export const VIDEO_CATEGORY_SLUGS: readonly string[] = VIDEO_CATEGORIES.map(
  (c) => c.slug
);

export const LISTING_CATEGORY_SLUGS: readonly string[] = CATEGORIES.filter(
  (c) => c.kind === "listing"
).map((c) => c.slug);

export function getCategory(slug: string): CategoryDefinition | undefined {
  return BY_SLUG.get(slug);
}

/**
 * Fail closed: an unknown or unmigrated category is treated as a paid video so
 * a missing row can never accidentally hand out free access.
 */
export function categoryAccess(slug: string): CategoryAccess {
  return BY_SLUG.get(slug)?.access ?? "paid";
}

export function isVideoCategory(slug: string): boolean {
  return (BY_SLUG.get(slug)?.kind ?? "video") === "video";
}

export function isListingCategory(slug: string): boolean {
  return (BY_SLUG.get(slug)?.kind ?? "video") === "listing";
}

export type CategoryAccessMap = Record<string, CategoryAccess>;

export const DEFAULT_ACCESS_MAP: CategoryAccessMap = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c.access])
);

/**
 * Reads the live access rules from `public.categories`, falling back to the
 * static map when the table is missing or unreadable.
 */
export async function fetchCategoryAccess(
  supabase: SupabaseClient
): Promise<CategoryAccessMap> {
  const { data, error } = await supabase.from("categories").select("slug, access");

  if (error || !data || data.length === 0) {
    return DEFAULT_ACCESS_MAP;
  }

  const map: CategoryAccessMap = { ...DEFAULT_ACCESS_MAP };
  for (const row of data) {
    if (row.slug && (row.access === "free" || row.access === "paid")) {
      map[row.slug] = row.access;
    }
  }
  return map;
}

/** True when the category can be watched without a paid subscription. */
export function isFreeAccess(
  slug: string,
  accessMap: CategoryAccessMap = DEFAULT_ACCESS_MAP
): boolean {
  return (accessMap[slug] ?? "paid") === "free";
}

/**
 * Validates an upload against the category's technical rules.
 * Returns `null` when the upload is acceptable, otherwise the reason.
 */
export function validateUploadForCategory(
  category: string,
  meta: { width?: number | null; height?: number | null; durationSeconds?: number | null }
): string | null {
  const def = BY_SLUG.get(category);
  if (!def || def.kind !== "video") return null;

  if (def.aspect === "9:16") {
    const { width, height } = meta;
    if (!width || !height) {
      return "Could not read the video dimensions. Try a different file.";
    }
    // 9:16 tolerates a small deviation so real phone footage still passes.
    const ratio = width / height;
    const target = 9 / 16;
    if (Math.abs(ratio - target) / target > 0.08) {
      return `${def.label} must be vertical (9:16). This file is ${ratio.toFixed(2)}:1.`;
    }
  }

  if (def.maxSeconds && meta.durationSeconds) {
    if (meta.durationSeconds > def.maxSeconds) {
      const limit = Math.round(def.maxSeconds / 60);
      return `${def.label} must be ${limit} minute${limit === 1 ? "" : "s"} or shorter.`;
    }
  }

  return null;
}
