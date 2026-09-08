export default function TldrBox({ summary }: { summary: string }) {
  if (!summary) return null
  return (
    <section aria-label="핵심 요약" className="my-6 border-l-4 border-gray-300 pl-5 py-1">
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">한눈에 보기</h2>
      <p className="text-base font-semibold text-gray-900 leading-snug">{summary}</p>
      <p className="mt-2 text-sm text-gray-500">
        신청 조건·금액·기간 등 자세한 내용은 아래 본문에서 확인하세요.
      </p>
    </section>
  )
}
