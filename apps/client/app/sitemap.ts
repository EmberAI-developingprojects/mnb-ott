import type { MetadataRoute } from "next";

/* Sitemap — search engine-ийн crawl-д ил болгох public хуудсууд.
   Dynamic content (VOD/:id, bundles/:id) шинэчлэх юм бол ирээдүйд
   backend-аас `/api/sitemap` хэлбэрээр generate хийж болно. */

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://play.mnb.mn";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  /* Static route — бүгдийг crawl зөвшөөрнө */
  const routes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`,         lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${SITE}/tv`,       lastModified: now, changeFrequency: "hourly",  priority: 0.9 },
    { url: `${SITE}/live`,     lastModified: now, changeFrequency: "hourly",  priority: 0.9 },
    { url: `${SITE}/library`,  lastModified: now, changeFrequency: "daily",   priority: 0.8 },
    { url: `${SITE}/archive`,  lastModified: now, changeFrequency: "daily",   priority: 0.8 },
    { url: `${SITE}/bundles`,  lastModified: now, changeFrequency: "daily",   priority: 0.7 },
    { url: `${SITE}/search`,   lastModified: now, changeFrequency: "weekly",  priority: 0.5 },
    { url: `${SITE}/help`,     lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE}/terms`,    lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE}/privacy`,  lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  return routes;
}
