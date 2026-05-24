import type { MetadataRoute } from "next";

/* Search engine crawler-уудад хандах зөвшөөрөл тогтооно.
   Auth, profile, payment гэх мэт хувийн хуудсыг disallow хийнэ.
   Production-д `NEXT_PUBLIC_SITE_URL` env-ээр domain тогтооно. */

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://play.mnb.mn";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow:     ["/"],
        disallow:  [
          "/profile",
          "/profile/*",
          "/watchlist",
          "/notifications",
          "/login",
          "/register",
          "/verify",
          "/reset-password",
          "/forgot-password",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host:    SITE,
  };
}
