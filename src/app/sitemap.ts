import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

/**
 * Served at /sitemap.xml. Lists only pages a signed-out visitor (and Google)
 * can open: every other /dashboard page redirects to /login.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${SITE_URL}/dashboard`, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/login`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
