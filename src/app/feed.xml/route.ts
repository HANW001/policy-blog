import { getArticles, CATEGORY_LABELS } from "@/lib/articles"

export const revalidate = 3600

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com"
  const articles = await getArticles({ limit: 20 })

  const items = articles
    .map((article) => {
      const link = `${siteUrl}/articles/${encodeURIComponent(article.slug)}`
      const pubDate = article.published_at ? new Date(article.published_at).toUTCString() : ""
      return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${escapeXml(article.summary ?? "")}</description>
      <pubDate>${pubDate}</pubDate>
      <category>${escapeXml(CATEGORY_LABELS[article.category] ?? article.category)}</category>
    </item>`
    })
    .join("\n")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>정책정보</title>
    <link>${siteUrl}</link>
    <description>정부 제도, 지원금, 행정 정보를 쉽고 정확하게 안내합니다.</description>
    <language>ko-KR</language>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  })
}
