"use client"
import { useState } from "react"
import { estimateYearEndTax, formatWon } from "@/lib/calculators"

export default function YearEndTaxCalculator() {
  const [totalSalary, setTotalSalary] = useState("")
  const [prepaidTax, setPrepaidTax] = useState("")
  const [dependents, setDependents] = useState("1")
  const [creditCardUsage, setCreditCardUsage] = useState("")
  const [pensionSavings, setPensionSavings] = useState("")
  const [result, setResult] = useState<ReturnType<typeof estimateYearEndTax> | null>(null)

  const toNumber = (v: string) => Number(v.replace(/[^0-9]/g, "")) || 0

  const handleCalculate = () => {
    setResult(
      estimateYearEndTax({
        totalSalary: toNumber(totalSalary),
        prepaidTax: toNumber(prepaidTax),
        dependents: toNumber(dependents),
        creditCardUsage: toNumber(creditCardUsage),
        pensionSavings: toNumber(pensionSavings),
      })
    )
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="총급여액 (연간, 세전)" value={totalSalary} onChange={setTotalSalary} placeholder="예: 40000000" />
        <Field label="기납부세액 (이미 원천징수된 세금)" value={prepaidTax} onChange={setPrepaidTax} placeholder="예: 1500000" />
        <Field label="부양가족 수 (본인 포함)" value={dependents} onChange={setDependents} placeholder="예: 2" />
        <Field label="신용카드 등 연간 사용액" value={creditCardUsage} onChange={setCreditCardUsage} placeholder="예: 12000000" />
        <Field label="연금저축·IRP 연간 납입액" value={pensionSavings} onChange={setPensionSavings} placeholder="예: 3000000" />
      </div>

      <button
        onClick={handleCalculate}
        className="mt-6 w-full sm:w-auto rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 transition-colors"
      >
        환급액 계산하기
      </button>

      {result && (
        <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-5">
          <h2 className="text-sm font-bold text-blue-700 mb-2">계산 결과 (간이 추정)</h2>
          <p className="text-2xl font-bold text-blue-800 leading-tight">
            {result.refundEstimate >= 0
              ? `약 ${formatWon(result.refundEstimate)} 환급 예상`
              : `약 ${formatWon(Math.abs(result.refundEstimate))} 추가 납부 예상`}
          </p>

          <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Row label="근로소득공제" value={formatWon(result.earnedIncomeDeduction)} />
            <Row label="근로소득금액" value={formatWon(result.earnedIncomeAmount)} />
            <Row label="소득공제 합계" value={formatWon(result.totalIncomeDeduction)} />
            <Row label="과세표준" value={formatWon(result.taxBase)} />
            <Row label="산출세액" value={formatWon(result.calculatedTax)} />
            <Row label="세액공제 합계" value={formatWon(result.earnedIncomeTaxCredit + result.pensionTaxCredit)} />
            <Row label="결정세액(지방소득세 포함)" value={formatWon(result.totalDecidedTax)} />
            <Row label="기납부세액" value={formatWon(toNumber(prepaidTax))} />
          </dl>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-400 leading-relaxed">
        본 계산기는 근로소득세 기본 세율 구간을 적용한 <strong>간이 추정치</strong>이며, 실제 연말정산 결과와 다를 수 있습니다.
        정확한 금액은 국세청 홈택스 연말정산 간소화 서비스 또는 세무 전문가를 통해 확인하시기 바랍니다.
      </p>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
    </label>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-blue-100 pb-1">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-semibold text-gray-900">{value}</dd>
    </div>
  )
}
