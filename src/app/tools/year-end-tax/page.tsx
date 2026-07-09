import type { Metadata } from "next"
import { searchArticles } from "@/lib/articles"
import JsonLd from "@/components/JsonLd"
import Breadcrumb from "@/components/Breadcrumb"
import FaqSection from "@/components/FaqSection"
import RelatedArticles from "@/components/RelatedArticles"
import AdUnit from "@/components/AdUnit"
import YearEndTaxCalculator from "@/components/YearEndTaxCalculator"

export const revalidate = 3600

const TITLE = "연말정산 환급액 계산기"
const DESCRIPTION = "총급여, 기납부세액, 부양가족·신용카드·연금저축 공제 항목을 입력하면 예상 환급액을 간편하게 추정합니다."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
}

const FAQ_ITEMS = [
  {
    question: "연말정산 환급액 계산기는 얼마나 정확한가요?",
    answer:
      "근로소득세 기본 세율 구간과 주요 공제 항목을 반영한 간이 추정치입니다. 4대보험료·의료비·기부금 등 세부 공제는 반영되지 않으므로 실제 연말정산 결과와 차이가 있을 수 있습니다.",
  },
  {
    question: "기납부세액은 어디서 확인하나요?",
    answer:
      "매월 급여명세서의 원천징수 소득세 합계 또는 국세청 홈택스 '연말정산 간소화' 서비스에서 확인할 수 있습니다.",
  },
  {
    question: "정확한 환급액은 어떻게 확인하나요?",
    answer:
      "국세청 홈택스의 연말정산 간소화 서비스에서 실제 공제 자료를 반영해 계산하거나, 세무 전문가에게 문의하시기 바랍니다.",
  },
]

export default async function YearEndTaxPage() {
  const relatedArticles = await searchArticles("연말정산")

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com"
  const pageUrl = `${siteUrl}/tools/year-end-tax`

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
        { name: TITLE, href: "/tools/year-end-tax" },
      ]} />

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 leading-snug">{TITLE}</h1>
        <p className="mt-2 text-sm text-gray-500">{DESCRIPTION}</p>
      </header>

      <AdUnit slot="SLOT_TOP" />

      <YearEndTaxCalculator />

      <AdUnit slot="SLOT_MID" />

      <FaqSection items={FAQ_ITEMS} />

      <RelatedArticles articles={relatedArticles} />

      <AdUnit slot="SLOT_BOTTOM" format="multiplex" />
    </>
  )
}
