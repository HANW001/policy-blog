import type { Metadata } from "next"
import { searchArticles } from "@/lib/articles"
import JsonLd from "@/components/JsonLd"
import Breadcrumb from "@/components/Breadcrumb"
import FaqSection from "@/components/FaqSection"
import RelatedArticles from "@/components/RelatedArticles"
import AdUnit from "@/components/AdUnit"
import SeverancePayCalculator from "@/components/SeverancePayCalculator"

export const revalidate = 3600

const TITLE = "퇴직금 계산기"
const DESCRIPTION = "입사일, 퇴사일, 최근 3개월 급여를 입력하면 근로기준법 기본 산식으로 예상 퇴직금을 추정합니다."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
}

const FAQ_ITEMS = [
  {
    question: "퇴직금은 어떻게 계산하나요?",
    answer:
      "근로기준법상 기본 산식은 '1일 평균임금 × 30일 × (재직일수 ÷ 365)'입니다. 평균임금은 퇴직 직전 3개월간 받은 임금 총액을 그 기간의 총일수로 나눠 계산합니다.",
  },
  {
    question: "근속기간이 1년 미만이면 퇴직금을 받을 수 없나요?",
    answer:
      "네, 근로기준법상 계속 근로기간이 1년 미만이면 퇴직금 지급 의무가 없습니다. 4주 평균 1주 소정근로시간이 15시간 미만인 경우도 지급 대상에서 제외됩니다.",
  },
  {
    question: "상여금과 연차수당도 퇴직금 계산에 포함되나요?",
    answer:
      "연간 지급된 상여금과 미사용 연차수당은 3/12만큼 평균임금 산정에 포함되는 것이 원칙입니다. 본 계산기에서는 선택 입력 항목으로 반영할 수 있습니다.",
  },
]

export default async function SeverancePayPage() {
  const relatedArticles = await searchArticles("퇴직금")

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com"
  const pageUrl = `${siteUrl}/tools/severance-pay`

  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: TITLE,
    description: DESCRIPTION,
    url: pageUrl,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  }

  return (
    <>
      <JsonLd data={appJsonLd} />
      <JsonLd data={faqJsonLd} />

      <Breadcrumb items={[
        { name: "홈", href: "/" },
        { name: "계산기", href: "/tools" },
        { name: TITLE, href: "/tools/severance-pay" },
      ]} />

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 leading-snug">{TITLE}</h1>
        <p className="mt-2 text-sm text-gray-500">{DESCRIPTION}</p>
      </header>

      <AdUnit slot="SLOT_TOP" />

      <SeverancePayCalculator />

      <AdUnit slot="SLOT_MID" />

      <FaqSection items={FAQ_ITEMS} />

      <RelatedArticles articles={relatedArticles} />

      <AdUnit slot="SLOT_BOTTOM" format="multiplex" />
    </>
  )
}
