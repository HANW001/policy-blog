// 계산기 2종(연말정산·퇴직금)의 순수 계산 로직.
// 모두 "간이 추정치"이며, 실제 세액/퇴직금과 다를 수 있음 (각 페이지에 면책 문구 별도 표기).

export interface YearEndTaxInput {
  totalSalary: number // 총급여액 (연간, 원)
  prepaidTax: number // 기납부세액 (원천징수로 이미 낸 세금, 원)
  dependents: number // 부양가족 수 (본인 포함)
  creditCardUsage: number // 신용카드 등 연간 사용액 (원)
  pensionSavings: number // 연금저축·IRP 연간 납입액 (원)
}

export interface YearEndTaxResult {
  earnedIncomeDeduction: number
  earnedIncomeAmount: number
  personalDeduction: number
  insuranceDeduction: number
  creditCardDeduction: number
  totalIncomeDeduction: number
  taxBase: number
  calculatedTax: number
  earnedIncomeTaxCredit: number
  pensionTaxCredit: number
  decidedIncomeTax: number
  localIncomeTax: number
  totalDecidedTax: number
  refundEstimate: number // 양수면 환급, 음수면 추가 납부
}

// 근로소득공제 (2024년 이후 기준 구간)
function calcEarnedIncomeDeduction(totalSalary: number): number {
  if (totalSalary <= 5_000_000) return totalSalary * 0.7
  if (totalSalary <= 15_000_000) return 3_500_000 + (totalSalary - 5_000_000) * 0.4
  if (totalSalary <= 45_000_000) return 7_500_000 + (totalSalary - 15_000_000) * 0.15
  if (totalSalary <= 100_000_000) return 12_000_000 + (totalSalary - 45_000_000) * 0.05
  return 14_750_000 + (totalSalary - 100_000_000) * 0.02
}

// 종합소득세 기본 세율 구간 (누진공제 방식)
const INCOME_TAX_BRACKETS = [
  { limit: 14_000_000, rate: 0.06, deduction: 0 },
  { limit: 50_000_000, rate: 0.15, deduction: 1_260_000 },
  { limit: 88_000_000, rate: 0.24, deduction: 5_760_000 },
  { limit: 150_000_000, rate: 0.35, deduction: 15_440_000 },
  { limit: 300_000_000, rate: 0.38, deduction: 19_940_000 },
  { limit: 500_000_000, rate: 0.40, deduction: 25_940_000 },
  { limit: 1_000_000_000, rate: 0.42, deduction: 35_940_000 },
  { limit: Infinity, rate: 0.45, deduction: 65_940_000 },
]

function calcIncomeTax(taxBase: number): number {
  const bracket = INCOME_TAX_BRACKETS.find((b) => taxBase <= b.limit) ?? INCOME_TAX_BRACKETS[INCOME_TAX_BRACKETS.length - 1]
  return Math.max(0, taxBase * bracket.rate - bracket.deduction)
}

// 근로소득세액공제 — 총급여 구간별 한도 적용 (간이 추정)
function calcEarnedIncomeTaxCredit(calculatedTax: number, totalSalary: number): number {
  const raw = calculatedTax <= 1_300_000 ? calculatedTax * 0.55 : 715_000 + (calculatedTax - 1_300_000) * 0.3
  const cap = totalSalary <= 33_000_000 ? 740_000 : totalSalary <= 70_000_000 ? 660_000 : 500_000
  return Math.min(raw, cap)
}

export function estimateYearEndTax(input: YearEndTaxInput): YearEndTaxResult {
  const totalSalary = Math.max(0, input.totalSalary)
  const dependents = Math.max(1, input.dependents)
  const creditCardUsage = Math.max(0, input.creditCardUsage)
  const pensionSavings = Math.max(0, input.pensionSavings)

  const earnedIncomeDeduction = calcEarnedIncomeDeduction(totalSalary)
  const earnedIncomeAmount = Math.max(0, totalSalary - earnedIncomeDeduction)

  const personalDeduction = dependents * 1_500_000
  // 4대보험료(국민연금·건강보험·장기요양·고용보험 근로자 부담분) 소득공제 추정치
  const insuranceDeduction = totalSalary * 0.085

  const creditCardThreshold = totalSalary * 0.25
  const creditCardExcess = Math.max(0, creditCardUsage - creditCardThreshold)
  const creditCardDeduction = Math.min(creditCardExcess * 0.15, 3_000_000)

  const totalIncomeDeduction = personalDeduction + insuranceDeduction + creditCardDeduction
  const taxBase = Math.max(0, earnedIncomeAmount - totalIncomeDeduction)

  const calculatedTax = calcIncomeTax(taxBase)
  const earnedIncomeTaxCredit = calcEarnedIncomeTaxCredit(calculatedTax, totalSalary)

  const pensionEligible = Math.min(pensionSavings, 6_000_000)
  const pensionRate = totalSalary <= 55_000_000 ? 0.15 : 0.12
  const pensionTaxCredit = pensionEligible * pensionRate

  const decidedIncomeTax = Math.max(0, calculatedTax - earnedIncomeTaxCredit - pensionTaxCredit)
  const localIncomeTax = decidedIncomeTax * 0.1
  const totalDecidedTax = decidedIncomeTax + localIncomeTax

  const refundEstimate = input.prepaidTax - totalDecidedTax

  return {
    earnedIncomeDeduction,
    earnedIncomeAmount,
    personalDeduction,
    insuranceDeduction,
    creditCardDeduction,
    totalIncomeDeduction,
    taxBase,
    calculatedTax,
    earnedIncomeTaxCredit,
    pensionTaxCredit,
    decidedIncomeTax,
    localIncomeTax,
    totalDecidedTax,
    refundEstimate,
  }
}

export interface SeverancePayInput {
  startDate: string // 입사일 (YYYY-MM-DD)
  endDate: string // 퇴사일 (YYYY-MM-DD)
  recentThreeMonthsPay: number // 최근 3개월 총 급여(세전, 원)
  annualBonus: number // 연간 상여금 총액 (선택, 원)
  annualLeaveAllowance: number // 연차수당 (선택, 원)
}

export interface SeverancePayResult {
  tenureDays: number
  periodDays: number
  averageDailyWage: number
  severancePay: number
  eligible: boolean // 근속 1년 미만이면 법정 지급 의무 없음
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function estimateSeverancePay(input: SeverancePayInput): SeverancePayResult | null {
  const start = new Date(input.startDate)
  const end = new Date(input.endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null

  const tenureDays = Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY)

  const threeMonthsAgo = new Date(end)
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const periodDays = Math.max(1, Math.floor((end.getTime() - threeMonthsAgo.getTime()) / MS_PER_DAY))

  const bonusPortion = Math.max(0, input.annualBonus) * (3 / 12)
  const leavePortion = Math.max(0, input.annualLeaveAllowance) * (3 / 12)
  const totalWageForPeriod = Math.max(0, input.recentThreeMonthsPay) + bonusPortion + leavePortion

  const averageDailyWage = totalWageForPeriod / periodDays
  const severancePay = averageDailyWage * 30 * (tenureDays / 365)

  return {
    tenureDays,
    periodDays,
    averageDailyWage,
    severancePay,
    eligible: tenureDays >= 365,
  }
}

export function formatWon(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}원`
}
