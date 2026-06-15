import Link from "next/link"
import { PolicyArticle, CATEGORY_LABELS } from "@/lib/articles"

export default function ArticleCard({ article }: { article: PolicyArticle }) {
  return (
    <Link href={`/articles/${article.slug}`} className="block rounded-lg border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all">
      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
        {CATEGORY_LABELS[article.category] ?? article.category}
      </span>
      <h2 className="mt-2 text-base font-semibold text-gray-900 leading-snug line-clamp-2">
        {article.title}
      </h2>
      <p className="mt-1 text-sm text-gray-500 line-clamp-2">{article.summary}</p>
      <p className="mt-2 text-xs text-gray-400">
        {article.published_at ? new Date(article.published_at).toLocaleDateString("ko-KR") : ""}
      </p>
    </Link>
  )
}
