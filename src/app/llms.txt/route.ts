import { CATEGORY_LABELS } from "@/lib/articles"

// GEO(생성형 AI 답변 인용) 목적 — AI 크롤러/에이전트가 사이트 구조를 빠르게 파악하도록
// 제공하는 llms.txt (https://llmstxt.org 관례). robots.ts의 AI 크롤러 허용과 짝을 이룬다.
export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com"

  const categoryLines = Object.entries(CATEGORY_LABELS)
    .map(([slug, label]) => `- [${label}](${siteUrl}/category/${slug})`)
    .join("\n")

  const body = `# 정책정보

> 정부 제도·지원금(근로장려금, 실업급여, 청년 주거·전세자금, 연말정산, 4대보험 등)의 신청 자격·금액·절차를 공식 출처(국세청·고용노동부·국토교통부 등) 수치 기준으로 정리하는 블로그.

각 글은 요약 첫 문장에서 신청 가능 여부를 즉시 답하고, 자격 요건 비교표·페르소나 계산 예시·FAQ·공식 출처 링크로 구성된다.

## 카테고리
${categoryLines}

## 전체 글 목록
- [전체 글](${siteUrl}/articles)
- [사이트맵](${siteUrl}/sitemap.xml)
`

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
