import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      allow: "/",
      disallow: ["/jobs", "/settings", "/editor", "/analyze", "/api/"],
      userAgent: "*",
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
