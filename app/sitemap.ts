import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      changeFrequency: "monthly",
      lastModified: new Date(),
      priority: 1,
      url: BASE,
    },
    {
      changeFrequency: "yearly",
      lastModified: new Date(),
      priority: 0.8,
      url: `${BASE}/login`,
    },
    {
      changeFrequency: "yearly",
      lastModified: new Date(),
      priority: 0.8,
      url: `${BASE}/signup`,
    },
    {
      changeFrequency: "yearly",
      lastModified: new Date(),
      priority: 0.3,
      url: `${BASE}/privacy`,
    },
    {
      changeFrequency: "yearly",
      lastModified: new Date(),
      priority: 0.3,
      url: `${BASE}/terms`,
    },
  ];
}
