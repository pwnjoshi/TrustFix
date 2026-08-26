import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://trustfix.app";
  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/product`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/demo`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/security`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ];
}
