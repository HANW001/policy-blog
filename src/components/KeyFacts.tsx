// AI 발췌·피처드 스니펫이 수치를 그대로 인용하기 쉽도록
// 지원금액처럼 강조가 필요한 항목은 더 크게 표시한다.
const EMPHASIZED_KEYS = ["지원금액"]

export default function KeyFacts({ facts }: { facts: Record<string, string | undefined> }) {
  const entries = Object.entries(facts).filter(([, v]) => v)
  if (entries.length === 0) return null
  return (
    <div className="my-6 rounded-md border border-gray-200 p-5">
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">핵심 정보</h2>
      <dl className="divide-y divide-gray-100">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
            <dt className="text-sm text-gray-500 shrink-0">{k}</dt>
            <dd
              className={
                EMPHASIZED_KEYS.includes(k)
                  ? "text-lg font-bold text-blue-700 text-right"
                  : "text-sm font-semibold text-gray-900 text-right"
              }
            >
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
