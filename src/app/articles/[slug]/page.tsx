import { notFound } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { getArticleBySlug, getArticlesByCluster, getArticlesByPillar, getAllPublishedSlugs, CATEGORY_LABELS } from "@/lib/articles"
import JsonLd from "@/components/JsonLd"
import KeyFacts from "@/components/KeyFacts"
import TldrBox from "@/components/TldrBox"
import FaqSection from "@/components/FaqSection"
import ClusterNav from "@/components/ClusterNav"
import PillarChildren from "@/components/PillarChildren"
import Breadcrumb from "@/components/Breadcrumb"
import AdUnit from "@/components/AdUnit"
import { AUTHOR, REVIEWER } from "@/lib/author"
import type { Metadata } from "next"

export const revalidate = 86400

// 이름 끝 글자에 받침이 있으면 "이", 없으면 "가" (예: "편집팀" → "이").
function subjectParticle(name: string): "이" | "가" {
  const lastChar = name.charCodeAt(name.length - 1)
  const hasBatchim = lastChar >= 0xac00 && lastChar <= 0xd7a3 && (lastChar - 0xac00) % 28 !== 0
  return hasBatchim ? "이" : "가"
}

// content-api가 생성하는 본문 마크다운은 항상 "# {제목}"으로 시작해서 페이지 자체의
// <h1>(글 제목)과 똑같은 문장이 본문 안에서 또 한 번 큰 제목으로 찍힌다. 페이지에
// 이미 제목이 있으므로 본문 맨 앞의 H1은 항상 잘라낸다.
function stripLeadingH1(content: string): string {
  return content.replace(/^\s*#\s+.+(\r?\n)+/, "")
}

interface HowToStep {
  name: string
  text: string
}
interface HowToSection {
  name: string
  steps: HowToStep[]
}

const stripMarkdown = (s: string) => s.replace(/\*\*/g, "").trim()

// 패턴 A: "1. **단계명**: 설명\n   - 부가설명\n2. ..." 형태의 번호 매긴 목록.
function extractOrderedListSteps(blockLines: string[]): HowToStep[] | null {
  let j = 0
  while (j < blockLines.length && blockLines[j].trim() === "") j++
  if (!(j < blockLines.length && /^\d+\.\s+/.test(blockLines[j]))) return null

  const steps: HowToStep[] = []
  while (j < blockLines.length && /^\d+\.\s+/.test(blockLines[j])) {
    const itemText = blockLines[j].replace(/^\d+\.\s+/, "")
    j++
    const subLines: string[] = []
    while (j < blockLines.length && /^\s+[-*]\s+/.test(blockLines[j])) {
      subLines.push(blockLines[j].trim().replace(/^[-*]\s+/, ""))
      j++
    }
    const boldMatch = itemText.match(/^\*\*(.+?)\*\*[:：]?\s*(.*)$/)
    const rawName = boldMatch ? boldMatch[1] : itemText
    const rawText = [boldMatch ? boldMatch[2] : itemText, ...subLines].filter(Boolean).join(" ")
    steps.push({ name: stripMarkdown(rawName), text: stripMarkdown(rawText) || stripMarkdown(rawName) })
  }
  return steps
}

// 패턴 B: "**Step 1.** 설명\n→ 부가설명\n\n**Step 2.** ..." 처럼 굵은 글씨 단계 표시가
// 빈 줄로 구분된 문단마다 나오는 형태 (content-api가 이 형식도 섞어서 생성함).
function extractBoldStepParagraphs(blockLines: string[]): HowToStep[] | null {
  const paragraphs: string[][] = []
  let current: string[] = []
  for (const line of blockLines) {
    if (line.trim() === "") {
      if (current.length) paragraphs.push(current)
      current = []
    } else {
      current.push(line)
    }
  }
  if (current.length) paragraphs.push(current)

  const steps: HowToStep[] = []
  for (const para of paragraphs) {
    const stepMatch = para[0].trim().match(/^\*\*(?:Step\s*\d+\.?|\d+\s*단계[:.]?)\*\*\s*(.*)$/i)
    if (!stepMatch) continue
    const restFirst = stripMarkdown(stepMatch[1])
    const continuation = para.slice(1).map((l) => stripMarkdown(l).replace(/^→\s*/, "")).filter(Boolean)
    const fullText = [restFirst, ...continuation].filter(Boolean).join(" ")
    steps.push({ name: restFirst || fullText, text: fullText || restFirst })
  }
  return steps.length > 0 ? steps : null
}

// 패턴 C: "### Step 1. 설명\n본문...\n### Step 2. ..." 처럼 각 단계가 소제목(###)
// 자체인 형태. "### 사전 준비: ..."처럼 Step이 아닌 다른 H3는 건너뛴다.
function extractHeadingStepSections(blockLines: string[]): HowToStep[] | null {
  const steps: HowToStep[] = []
  let k = 0
  while (k < blockLines.length) {
    const stepHeadingMatch = blockLines[k].match(/^###\s+Step\s*\d+\.?\s*(.*)$/i)
    if (!stepHeadingMatch) {
      k++
      continue
    }
    const name = stripMarkdown(stepHeadingMatch[1])
    k++
    const bodyLines: string[] = []
    while (k < blockLines.length && !/^#{2,3}\s+/.test(blockLines[k])) {
      bodyLines.push(blockLines[k])
      k++
    }
    const text = stripMarkdown(bodyLines.join(" ").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"))
    steps.push({ name, text: text || name })
  }
  return steps.length > 0 ? steps : null
}

// 소제목(##) 바로 아래 블록에서 번호 목록/굵은 Step 문단 형태의 절차를 찾아
// HowTo 스키마용 단계로 뽑아낸다. 최소 2단계 이상 있어야 절차로 인정해서
// 무관한 목록이 오탐으로 HowTo가 되지 않게 한다.
function extractHowToSections(markdown: string): HowToSection[] {
  const lines = markdown.split(/\r?\n/)
  const sections: HowToSection[] = []
  let i = 0
  while (i < lines.length) {
    const headingMatch = lines[i].match(/^##\s+(.+)$/)
    if (!headingMatch) {
      i++
      continue
    }
    const sectionName = headingMatch[1].trim()
    let j = i + 1
    const blockLines: string[] = []
    while (j < lines.length && !/^##\s+/.test(lines[j]) && lines[j].trim() !== "---") {
      blockLines.push(lines[j])
      j++
    }

    const steps =
      extractOrderedListSteps(blockLines) ??
      extractBoldStepParagraphs(blockLines) ??
      extractHeadingStepSections(blockLines)
    if (steps && steps.length >= 2) {
      sections.push({ name: sectionName, steps })
    }
    i = j
  }
  return sections
}

export async function generateStaticParams() {
  const slugs = await getAllPublishedSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug: rawSlug } = await params
  const slug = decodeURIComponent(rawSlug)
  const article = await getArticleBySlug(slug)
  if (!article) return {}
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com"
  const articleUrl = `${siteUrl}/articles/${article.slug}`
  return {
    title: article.title,
    description: article.summary,
    keywords: [CATEGORY_LABELS[article.category], ...article.title.split(/[\s—·]+/).filter((w) => w.length > 1)],
    alternates: { canonical: articleUrl },
    openGraph: {
      title: article.title,
      description: article.summary,
      url: articleUrl,
      siteName: "정책정보",
      locale: "ko_KR",
      type: "article",
      publishedTime: article.published_at,
      modifiedTime: article.updated_at,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.summary,
    },
  }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params
  const slug = decodeURIComponent(rawSlug)
  const [article, clusterArticles, pillarChildren] = await Promise.all([
    getArticleBySlug(slug),
    getArticleBySlug(slug).then((a) =>
      a ? getArticlesByCluster(a.cluster, slug) : []
    ),
    getArticleBySlug(slug).then((a) =>
      a?.article_role === "pillar" ? getArticlesByPillar(a.slug, slug) : []
    ),
  ])

  if (!article) notFound()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com"
  const articleUrl = `${siteUrl}/articles/${article.slug}`

  const ogImageUrl = `${siteUrl}/articles/${article.slug}/opengraph-image`

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.summary,
    inLanguage: "ko-KR",
    datePublished: article.published_at,
    dateModified: article.updated_at,
    url: articleUrl,
    mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
    image: { "@type": "ImageObject", url: ogImageUrl },
    author: { "@type": "Person", name: AUTHOR.name, description: AUTHOR.description, url: `${siteUrl}/about` },
    publisher: { "@type": "Organization", name: "정책정보", url: siteUrl },
    keywords: CATEGORY_LABELS[article.category],
    ...(article.review_meta?.human_action === "approved"
      ? {
          reviewedBy: {
            "@type": "Person",
            name: REVIEWER.name,
            description: REVIEWER.description,
          },
        }
      : {}),
  }

  const faqJsonLd = article.faq_items?.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: article.faq_items.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  } : null

  const howToJsonLds = extractHowToSections(article.content).map((section) => ({
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: section.name,
    step: section.steps.map((s, idx) => ({
      "@type": "HowToStep",
      position: idx + 1,
      name: s.name,
      text: s.text,
    })),
  }))

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "홈", item: siteUrl },
      { "@type": "ListItem", position: 2, name: CATEGORY_LABELS[article.category], item: `${siteUrl}/category/${article.category}` },
      { "@type": "ListItem", position: 3, name: article.title, item: articleUrl },
    ],
  }

  return (
    <>
      <JsonLd data={articleJsonLd} />
      {faqJsonLd && <JsonLd data={faqJsonLd} />}
      {howToJsonLds.map((data, i) => <JsonLd key={i} data={data} />)}
      <JsonLd data={breadcrumbJsonLd} />

      <Breadcrumb items={[
        { name: "홈", href: "/" },
        { name: CATEGORY_LABELS[article.category], href: `/category/${article.category}` },
        { name: article.title, href: `/articles/${article.slug}` },
      ]} />

      <article>
        <header className="mb-8">
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
            {CATEGORY_LABELS[article.category]}
          </span>
          <h1 className="mt-3 text-3xl font-bold text-gray-900 leading-tight">{article.title}</h1>
          <div className="mt-5 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {AUTHOR.name.charAt(0)}
            </div>
            <div className="text-sm leading-snug">
              <a href="/about" className="font-medium text-gray-900 hover:underline">
                {AUTHOR.name}
              </a>
              <div className="text-gray-500">
                {article.published_at && new Date(article.published_at).toLocaleDateString("ko-KR")} ·{" "}
                <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  공식 출처 확인
                </a>
              </div>
            </div>
          </div>
        </header>

        <AdUnit slot="SLOT_TOP" />

        <KeyFacts facts={article.key_facts ?? {}} />

        <TldrBox summary={article.summary} />

        <div className="prose prose-lg max-w-none mt-6 text-gray-800">
          <ReactMarkdown remarkPlugins={[[remarkGfm, { singleTilde: false }]]}>{stripLeadingH1(article.content)}</ReactMarkdown>
        </div>

        <AdUnit slot="SLOT_MID" />

        <FaqSection items={article.faq_items ?? []} />

        <PillarChildren articles={pillarChildren} />

        <ClusterNav articles={clusterArticles} />

        {article.review_meta?.human_action === "approved" && (
          <p className="mt-8 text-xs text-gray-400">
            {REVIEWER.name}
            {subjectParticle(REVIEWER.name)} 검토했습니다 (
            {new Date(article.review_meta.reviewed_at).toLocaleDateString("ko-KR")})
          </p>
        )}

        <AdUnit slot="SLOT_BOTTOM" format="multiplex" />
      </article>
    </>
  )
}
