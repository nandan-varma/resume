import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#0a0a0a",
    description: "AI-powered resume matching",
    display: "standalone",
    icons: [
      {
        sizes: "192x192",
        src: "/brand/icon-192.png",
        type: "image/png",
      },
      {
        purpose: "maskable",
        sizes: "512x512",
        src: "/brand/icon-512.png",
        type: "image/png",
      },
    ],
    name: "JobMatch",
    short_name: "JobMatch",
    start_url: "/",
    theme_color: "#0a0a0a",
  };
}
