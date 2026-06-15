import { notFound } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { getArticleBySlug, getArticlesByCluster, getAllPublishedSlugs, CATEGORY_LABELS } from "@/lib/articles"
import JsonLd from "@/components/JsonLd"
import KeyFacts from "@/components/KeyFacts"
import FaqSection from "@/components/FaqSection"
import ClusterNav from "@/components/ClusterNav"
import Breadcrumb from "@/components/Breadcrumb"
import AdUnit from "@/components/AdUnit"
import type { Metadata } from "next"

export const revalidate = 86400

export async function generateStaticParams() {
  const slugs = await getAllPublishedSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
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
  const { slug } = await params
  const [article, clusterArticles] = await Promise.all([
    getArticleBySlug(slug),
    getArticleBySlug(slug).then((a) =>
      a ? getArticlesByCluster(a.cluster, slug) : []
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
    author: { "@type": "Organization", name: "정책정보", url: siteUrl },
    publisher: { "@type": "Organization", name: "정책정보", url: siteUrl },
    keywords: CATEGORY_LABELS[article.category],
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
      <JsonLd data={breadcrumbJsonLd} />

      <Breadcrumb items={[
        { name: "홈", href: "/" },
        { name: CATEGORY_LABELS[article.category], href: `/category/${article.category}` },
        { name: article.title, href: `/articles/${article.slug}` },
      ]} />

      <article>
        <header className="mb-6">
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
            {CATEGORY_LABELS[article.category]}
          </span>
          <h1 className="mt-3 text-2xl font-bold text-gray-900 leading-snug">{article.title}</h1>
          <p className="mt-2 text-sm text-gray-500">
            {article.published_at && new Date(article.published_at).toLocaleDateString("ko-KR")} ·{" "}
            <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
              공식 출처 확인
            </a>
          </p>
        </header>

        <AdUnit slot="SLOT_TOP" />

        <KeyFacts facts={article.key_facts ?? {}} />

        <div className="prose prose-sm max-w-none mt-6 text-gray-800">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.content}</ReactMarkdown>
        </div>

        <AdUnit slot="SLOT_MID" />

        <FaqSection items={article.faq_items ?? []} />

        <ClusterNav articles={clusterArticles} />

        <AdUnit slot="SLOT_BOTTOM" format="multiplex" />
      </article>
    </>
  )
}
