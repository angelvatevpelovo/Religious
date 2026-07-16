import type { MetadataRoute } from "next";

const baseUrl = "https://religious-rb2l.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/search", "/book", "/temples", "/ai", "/reminders"],
      disallow: ["/favorites", "/ai-history", "/profile"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
