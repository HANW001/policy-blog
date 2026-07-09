export default function TldrBox({ summary }: { summary: string }) {
  if (!summary) return null
  return (
    <section aria-label="핵심 요약" className="my-6 rounded-lg border border-gray-200 bg-gray-50 p-5">
      <h2 className="text-xs font-bold text-gray-500 mb-2">한눈에 보기</h2>
      <p className="text-base font-semibold text-gray-900 leading-snug">{summary}</p>
      <p className="mt-2 text-sm text-gray-500">
        신청 조건·금액·기간 등 자세한 내용은 아래 본문에서 확인하세요.
      </p>
    </section>
  )
}
