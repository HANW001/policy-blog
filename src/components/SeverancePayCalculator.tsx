"use client"
import { useState } from "react"
import { estimateSeverancePay, formatWon } from "@/lib/calculators"

export default function SeverancePayCalculator() {
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [recentThreeMonthsPay, setRecentThreeMonthsPay] = useState("")
  const [annualBonus, setAnnualBonus] = useState("")
  const [annualLeaveAllowance, setAnnualLeaveAllowance] = useState("")
  const [result, setResult] = useState<ReturnType<typeof estimateSeverancePay>>(null)
  const [error, setError] = useState("")

  const toNumber = (v: string) => Number(v.replace(/[^0-9]/g, "")) || 0

  const handleCalculate = () => {
    setError("")
    const r = estimateSeverancePay({
      startDate,
      endDate,
      recentThreeMonthsPay: toNumber(recentThreeMonthsPay),
      annualBonus: toNumber(annualBonus),
      annualLeaveAllowance: toNumber(annualLeaveAllowance),
    })
    if (!r) {
      setError("입사일과 퇴사일을 올바르게 입력해 주세요 (퇴사일이 입사일보다 이후여야 합니다).")
      setResult(null)
      return
    }
    setResult(r)
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">입사일</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">퇴사일</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </label>
        <Field label="최근 3개월 총 급여 (세전 합계)" value={recentThreeMonthsPay} onChange={setRecentThreeMonthsPay} placeholder="예: 9000000" />
        <Field label="연간 상여금 총액 (선택)" value={annualBonus} onChange={setAnnualBonus} placeholder="예: 3000000" />
        <Field label="연차수당 (선택)" value={annualLeaveAllowance} onChange={setAnnualLeaveAllowance} placeholder="예: 500000" />
      </div>

      <button
        onClick={handleCalculate}
        className="mt-6 w-full sm:w-auto rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 transition-colors"
      >
        퇴직금 계산하기
      </button>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-5">
          <h2 className="text-sm font-bold text-blue-700 mb-2">계산 결과 (간이 추정)</h2>
          <p className="text-2xl font-bold text-blue-800 leading-tight">약 {formatWon(result.severancePay)}</p>

          {!result.eligible && (
            <p className="mt-2 text-sm font-medium text-red-600">
              근속기간이 1년 미만이면 근로기준법상 퇴직금 지급 의무가 없습니다. 참고용으로만 확인하세요.
            </p>
          )}

          <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Row label="재직일수" value={`${result.tenureDays.toLocaleString("ko-KR")}일`} />
            <Row label="평균임금 산정기간" value={`${result.periodDays.toLocaleString("ko-KR")}일`} />
            <Row label="1일 평균임금" value={formatWon(result.averageDailyWage)} />
            <Row label="계산식" value="1일 평균임금 × 30 × (재직일수 ÷ 365)" />
          </dl>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-400 leading-relaxed">
        본 계산기는 근로기준법상 기본 산식(1일 평균임금 × 30일 × 재직일수/365)을 적용한 <strong>간이 추정치</strong>이며,
        실제 퇴직금과 다를 수 있습니다. 정확한 금액은 사업장 취업규칙 및 고용노동부 퇴직금 계산기를 통해 확인하시기 바랍니다.
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
