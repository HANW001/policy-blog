export default function KeyFacts({ facts }: { facts: Record<string, string | undefined> }) {
  const entries = Object.entries(facts).filter(([, v]) => v)
  if (entries.length === 0) return null
  return (
    <div className="my-6 rounded-lg border border-blue-200 bg-blue-50 p-5">
      <h2 className="text-sm font-bold text-blue-700 mb-3">핵심 정보 요약</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {entries.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-gray-500">{k}</dt>
            <dd className="text-sm font-semibold text-gray-900">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
