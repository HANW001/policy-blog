import { getArticles } from "@/lib/articles"
import ArticleCard from "@/components/ArticleCard"
import Link from "next/link"

export const revalidate = 3600

export default async function HomePage() {
  const [latest, 소득, 청년, 세금, 복지] = await Promise.all([
    getArticles({ limit: 6 }),
    getArticles({ category: "소득_지원", limit: 3 }),
    getArticles({ category: "청년_주거", limit: 3 }),
    getArticles({ category: "세금_행정", limit: 3 }),
    getArticles({ category: "복지", limit: 3 }),
  ])

  return (
    <div>
      <section className="mb-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">정부 제도·지원금 안내</h1>
        <p className="text-gray-500 text-sm">신청 조건부터 절차까지, 공식 출처 기반으로 정확하게 안내합니다.</p>
      </section>

      {latest.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">최신 글</h2>
            <Link href="/articles" className="text-sm text-blue-700 hover:underline">전체 보기 →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {latest.map((a) => <ArticleCard key={a.slug} article={a} />)}
          </div>
        </section>
      )}

      {[
        { label: "소득·지원", items: 소득, cat: "소득_지원" },
        { label: "청년·주거", items: 청년, cat: "청년_주거" },
        { label: "세금·행정", items: 세금, cat: "세금_행정" },
        { label: "복지", items: 복지, cat: "복지" },
      ].map(({ label, items, cat }) =>
        items.length > 0 ? (
          <section key={cat} className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{label}</h2>
              <Link href={`/category/${cat}`} className="text-sm text-blue-700 hover:underline">더 보기 →</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {items.map((a) => <ArticleCard key={a.slug} article={a} />)}
            </div>
          </section>
        ) : null
      )}

      {latest.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-4">📋</p>
          <p>곧 콘텐츠가 업로드됩니다.</p>
        </div>
      )}
    </div>
  )
}
