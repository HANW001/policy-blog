import type { Metadata } from "next"
import { getArticles, searchArticles } from "@/lib/articles"
import ArticleCard from "@/components/ArticleCard"

export const revalidate = 3600

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}): Promise<Metadata> {
  const { q } = await searchParams
  if (q) {
    const results = await searchArticles(q)
    if (results.length === 0) {
      return {
        title: "전체 글",
        description: "정부 제도·지원금·행정 정보 전체 글 목록",
        robots: { index: false, follow: true },
      }
    }
  }
  return {
    title: "전체 글",
    description: "정부 제도·지원금·행정 정보 전체 글 목록",
  }
}

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const articles = q ? await searchArticles(q) : await getArticles({ limit: 50 })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{q ? `"${q}" 검색 결과` : "전체 글"}</h1>
      <form method="get" className="mb-8 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="제도명, 지원금 검색..."
          className="flex-1 rounded border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button type="submit" className="rounded bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-800">
          검색
        </button>
      </form>
      {articles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {articles.map((a) => <ArticleCard key={a.slug} article={a} />)}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-16">검색 결과가 없습니다.</p>
      )}
    </div>
  )
}
