import { MetadataRoute } from "next"
import { getAllPublishedSlugs } from "@/lib/articles"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com"
  const slugs = await getAllPublishedSlugs()

  const articleEntries: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${siteUrl}/articles/${slug}`,
    changeFrequency: "monthly",
    priority: 0.8,
  }))

  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "daily", priority: 1.0 },
    { url: `${siteUrl}/articles`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/category/소득_지원`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/category/청년_주거`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/category/세금_행정`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/about`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${siteUrl}/contact`, changeFrequency: "yearly", priority: 0.3 },
  ]

  return [...staticPages, ...articleEntries]
}
