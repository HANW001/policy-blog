import Link from "next/link"
import { PolicyArticle } from "@/lib/articles"

export default function ClusterNav({ articles }: { articles: PolicyArticle[] }) {
  if (!articles || articles.length === 0) return null
  return (
    <aside className="mt-10 rounded-lg border border-gray-200 p-5">
      <h3 className="text-sm font-bold text-gray-700 mb-3">관련 글</h3>
      <ul className="space-y-2">
        {articles.map((a) => (
          <li key={a.slug}>
            <Link href={`/articles/${a.slug}`} className="text-sm text-blue-700 hover:underline line-clamp-1">
              {a.title}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  )
}
