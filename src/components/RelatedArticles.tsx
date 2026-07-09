import Link from "next/link"
import { PolicyArticle, CATEGORY_LABELS } from "@/lib/articles"

export default function RelatedArticles({ articles }: { articles: PolicyArticle[] }) {
  if (articles.length === 0) return null
  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold mb-4">관련 글</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {articles.map((a) => (
          <Link
            key={a.slug}
            href={`/articles/${a.slug}`}
            className="block rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              {CATEGORY_LABELS[a.category] ?? a.category}
            </span>
            <h3 className="mt-2 text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{a.title}</h3>
          </Link>
        ))}
      </div>
    </section>
  )
}
