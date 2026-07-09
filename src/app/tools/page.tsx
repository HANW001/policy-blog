import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "계산기",
  description: "연말정산 환급액, 퇴직금 등 생활 속 세금·노무 계산을 무료로 간편하게 추정해보세요.",
}

const tools = [
  {
    href: "/tools/year-end-tax",
    title: "연말정산 환급액 계산기",
    description: "총급여, 기납부세액, 공제 항목을 입력하면 예상 환급액(또는 추가 납부액)을 간편하게 추정합니다.",
  },
  {
    href: "/tools/severance-pay",
    title: "퇴직금 계산기",
    description: "입사일·퇴사일·최근 3개월 급여를 입력하면 근로기준법 기본 산식으로 예상 퇴직금을 추정합니다.",
  },
]

export default function ToolsIndexPage() {
  return (
    <div>
      <section className="mb-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">계산기</h1>
        <p className="text-gray-500 text-sm">
          세금·노무 관련 수치를 빠르게 추정해볼 수 있는 간이 계산기입니다. 모든 결과는 참고용이며 법적 효력이 없습니다.
        </p>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="block rounded-lg border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <h2 className="text-base font-semibold text-gray-900">{tool.title}</h2>
            <p className="mt-1 text-sm text-gray-500">{tool.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
