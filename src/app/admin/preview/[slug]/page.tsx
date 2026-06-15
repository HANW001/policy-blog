import { notFound } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { getArticleBySlugAdmin, CATEGORY_LABELS } from "@/lib/articles"
import KeyFacts from "@/components/KeyFacts"
import FaqSection from "@/components/FaqSection"

const STATUS_LABELS: Record<string, string> = {
  draft: "초안",
  review: "검수중",
  published: "발행됨",
}
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  review: "bg-blue-100 text-blue-800",
  published: "bg-green-100 text-green-800",
}

export default async function AdminPreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params
  const slug = decodeURIComponent(rawSlug)
  const article = await getArticleBySlugAdmin(slug)
  if (!article) notFound()

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-6 p-3 bg-orange-50 border border-orange-200 rounded text-sm text-orange-700 flex items-center gap-2">
        <span>⚠ Admin 미리보기 — 발행 전 글입니다</span>
        <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded ${STATUS_COLORS[article.status]}`}>
          {STATUS_LABELS[article.status]}
        </span>
      </div>

      <article>
        <header className="mb-6">
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
            {CATEGORY_LABELS[article.category]}
          </span>
          <h1 className="mt-3 text-2xl font-bold text-gray-900 leading-snug">{article.title}</h1>
          <p className="mt-2 text-sm text-gray-500">
            업데이트: {new Date(article.updated_at).toLocaleString("ko-KR")} ·{" "}
            <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
              공식 출처 확인
            </a>
          </p>
        </header>

        <KeyFacts facts={article.key_facts ?? {}} />

        <div className="prose prose-sm max-w-none mt-6 text-gray-800">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.content}</ReactMarkdown>
        </div>

        <FaqSection items={article.faq_items ?? []} />
      </article>
    </div>
  )
}
