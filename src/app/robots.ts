import { MetadataRoute } from "next"

// GEO(생성형 검색엔진 최적화) 목적 — AI 크롤러는 차단이 아니라 명시적으로 허용해
// 콘텐츠가 AI 답변에 인용되도록 한다.
const AI_CRAWLERS = [
  "GPTBot",
  "ClaudeBot",
  "Claude-Web",
  "PerplexityBot",
  "Google-Extended",
  "Amazonbot",
  "Applebot-Extended",
  "CCBot",
]

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com"
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/api/admin"] },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: ["/admin", "/api/admin"],
      })),
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
