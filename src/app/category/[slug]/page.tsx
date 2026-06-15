import { getArticles, CATEGORY_LABELS } from "@/lib/articles"
import ArticleCard from "@/components/ArticleCard"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

export const revalidate = 3600

const VALID_CATEGORIES = ["소득_지원", "청년_주거", "세금_행정", "복지"]

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const label = CATEGORY_LABELS[slug]
  if (!label) return {}
  return {
    title: label,
    description: `${label} 관련 정부 제도·지원금 정보`,
  }
}

export async function generateStaticParams() {
  return VALID_CATEGORIES.map((cat) => ({ slug: cat }))
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!VALID_CATEGORIES.includes(slug)) notFound()
  const articles = await getArticles({ category: slug, limit: 50 })
  const label = CATEGORY_LABELS[slug]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{label}</h1>
      {articles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {articles.map((a) => <ArticleCard key={a.slug} article={a} />)}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-16">준비 중입니다.</p>
      )}
    </div>
  )
}
