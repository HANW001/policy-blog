import Link from "next/link"
import { PolicyArticle } from "@/lib/articles"

// 필러 글 하단에 하위 클러스터 글 목록을 렌더링한다. ClusterNav("관련 글")와 달리
// 이 글이 필러(article_role: "pillar")일 때만 사용되며, pillar_slug로 자신을 참조하는
// 하위 글 전체를 토픽 구조로 보여준다.
export default function PillarChildren({ articles }: { articles: PolicyArticle[] }) {
  if (!articles || articles.length === 0) return null
  return (
    <section aria-label="하위 글 목록" className="mt-10 rounded-lg border border-blue-200 bg-blue-50/50 p-5">
      <h2 className="text-sm font-bold text-blue-700 mb-3">이 주제의 하위 글 ({articles.length}개)</h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
        {articles.map((a) => (
          <li key={a.slug}>
            <Link href={`/articles/${a.slug}`} className="text-sm text-blue-700 hover:underline line-clamp-1">
              {a.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
