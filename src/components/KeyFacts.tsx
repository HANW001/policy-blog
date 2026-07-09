// AI 발췌·피처드 스니펫이 수치를 그대로 인용하기 쉽도록
// 지원금액처럼 강조가 필요한 항목은 더 크게 표시한다.
const EMPHASIZED_KEYS = ["지원금액"]

export default function KeyFacts({ facts }: { facts: Record<string, string | undefined> }) {
  const entries = Object.entries(facts).filter(([, v]) => v)
  if (entries.length === 0) return null
  return (
    <div className="my-6 rounded-lg border border-blue-200 bg-blue-50 p-5">
      <h2 className="text-sm font-bold text-blue-700 mb-3">핵심 정보 요약</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {entries.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-gray-500">{k}</dt>
            <dd
              className={
                EMPHASIZED_KEYS.includes(k)
                  ? "text-xl font-bold text-blue-700 leading-tight"
                  : "text-sm font-semibold text-gray-900"
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
