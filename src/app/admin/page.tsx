"use client"
import { useEffect, useState, useCallback } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { LEVEL2_ENABLED } from "@/lib/featureFlags"
import { REVIEW_CHECKLIST } from "@/lib/reviewChecklist"

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL ?? "http://localhost:8000"

const STATUS_LABELS: Record<string, string> = {
  draft: "초안",
  review: "검수중",
  published: "발행됨",
}
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  review: "bg-blue-100 text-blue-800",
  published: "bg-green-100 text-green-800",
}
const STATUS_NEXT: Record<string, string> = {
  draft: "review",
  review: "published",
  published: "draft",
}
const STATUS_NEXT_LABEL: Record<string, string> = {
  draft: "검수 시작",
  review: "발행",
  published: "초안으로 되돌리기",
}

interface GenerationMeta {
  pass2_issues: string[]
  pass2_approved: boolean
}
interface Validation {
  passed: boolean
  issues: string[]
}
interface ReviewMeta {
  human_action: "approved" | "rejected"
  rejected_reason?: string
  reviewed_at: string
}
interface Article {
  slug: string
  title: string
  category: string
  status: string
  summary: string
  updated_at: string
  _generation_meta?: GenerationMeta
  review_report?: string
  validation?: Validation
  article_type?: "info" | "experience"
  review_meta?: ReviewMeta
  scheduled_publish_at?: string
}
interface Stats {
  reviewedCount: number
  rejectedCount: number
  rejectionRate: number
  level2Eligible: boolean
}
interface Config {
  slug: string
  title: string
  category: string
  cluster: string
}
interface Job {
  job_id: string
  slug: string
  status: "pending" | "running" | "done" | "failed"
  log?: string[]
  error?: string
  result?: { pass2_issues: string[]; pass2_approved: boolean }
}

// ── 로그인 화면 ──────────────────────────────────────────
function LoginScreen({
  onLogin,
}: {
  onLogin: (secret: string) => void
}) {
  const [secret, setSecret] = useState("")
  const [error, setError] = useState("")

  const tryLogin = async () => {
    const res = await fetch("/api/admin/drafts", {
      headers: { "x-admin-secret": secret },
    })
    if (res.ok) onLogin(secret)
    else setError("인증 실패")
  }

  return (
    <div className="max-w-sm mx-auto mt-20">
      <h1 className="text-xl font-bold mb-4">Admin 로그인</h1>
      <input
        type="password"
        className="w-full border rounded px-3 py-2 mb-3"
        placeholder="ADMIN_SECRET"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && tryLogin()}
      />
      <button
        className="w-full bg-blue-700 text-white py-2 rounded hover:bg-blue-800"
        onClick={tryLogin}
      >
        확인
      </button>
      {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
    </div>
  )
}

// ── 반려율 통계 패널 ──────────────────────────────────────
// Level 2 전환 조건: 애드센스 승인 완료 AND 반려율 10% 미만 (수동 판단, 여기선 데이터만 표시)
function StatsPanel({ secret }: { secret: string }) {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch("/api/admin/stats", { headers: { "x-admin-secret": secret } })
      .then((r) => (r.ok ? r.json() : null))
      .then(setStats)
      .catch(() => {})
  }, [secret])

  if (!stats) return null

  return (
    <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
      <span className="text-gray-500">
        검수 이력 {stats.reviewedCount}건 중 반려 {stats.rejectedCount}건
      </span>
      <span className={`font-semibold ${stats.level2Eligible ? "text-green-600" : "text-gray-700"}`}>
        반려율 {(stats.rejectionRate * 100).toFixed(1)}%
      </span>
      <span className="text-xs text-gray-400">
        Level 2 전환 조건: 애드센스 승인 완료 AND 반려율 10% 미만
        {stats.level2Eligible ? " — 반려율 조건 충족" : ""}
      </span>
    </div>
  )
}

// ── 검수 탭 ──────────────────────────────────────────────
function ReviewTab({ secret }: { secret: string }) {
  const [articles, setArticles] = useState<Article[]>([])
  const [filter, setFilter] = useState("all")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [fixingSlugs, setFixingSlugs] = useState<Set<string>>(new Set())
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set())
  const [checklist, setChecklist] = useState<Record<string, boolean[]>>({})
  const [rejectingSlug, setRejectingSlug] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [expandedReport, setExpandedReport] = useState<Set<string>>(new Set())

  const fetchArticles = useCallback(async () => {
    setLoading(true)
    const url =
      filter === "all" ? "/api/admin/drafts" : `/api/admin/drafts?status=${filter}`
    const res = await fetch(url, { headers: { "x-admin-secret": secret } })
    if (res.ok) setArticles(await res.json())
    setLoading(false)
  }, [filter, secret])

  useEffect(() => { fetchArticles() }, [fetchArticles])

  const toggleChecklistItem = (slug: string, index: number) => {
    setChecklist((prev) => {
      const current = prev[slug] ?? new Array(REVIEW_CHECKLIST.length).fill(false)
      const next = [...current]
      next[index] = !next[index]
      return { ...prev, [slug]: next }
    })
  }

  const toggleReport = (slug: string) => {
    setExpandedReport((prev) => {
      const s = new Set(prev)
      if (s.has(slug)) s.delete(slug)
      else s.add(slug)
      return s
    })
  }

  const submitReview = async (slug: string, action: "approved" | "rejected", reason?: string) => {
    const res = await fetch("/api/admin/drafts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ slug, review_action: action, ...(reason ? { rejected_reason: reason } : {}) }),
    })
    if (res.ok) {
      setMessage(`${slug} → ${action === "approved" ? "승인" : "반려"} 기록됨`)
      setRejectingSlug(null)
      setRejectReason("")
      fetchArticles()
    } else {
      const data = await res.json().catch(() => ({}))
      setMessage(data.error ?? `${slug} 검수 기록 실패`)
    }
  }

  const schedulePublish = async (slug: string) => {
    const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    const res = await fetch("/api/admin/drafts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ slug, scheduled_publish_at: in48h }),
    })
    if (res.ok) {
      setMessage(`${slug} → 48시간 후 예약 발행 등록`)
      fetchArticles()
    }
  }

  const cancelSchedule = async (slug: string) => {
    const res = await fetch("/api/admin/drafts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ slug, scheduled_publish_at: null }),
    })
    if (res.ok) {
      setMessage(`${slug} 예약 발행 회수됨`)
      fetchArticles()
    }
  }

  const fixArticle = async (slug: string) => {
    setFixingSlugs((prev) => new Set(prev).add(slug))
    const res = await fetch(`${FASTAPI_URL}/fix/${slug}`, {
      method: "POST",
      headers: { "x-admin-secret": secret },
    })
    setFixingSlugs((prev) => { const s = new Set(prev); s.delete(slug); return s })
    if (!res.ok) {
      setMessage(`${slug} AI 수정 실패`)
    }
  }

  const fixSelected = async () => {
    setMessage("")
    const slugs = Array.from(selectedSlugs)
    await Promise.all(slugs.map(fixArticle))
    setSelectedSlugs(new Set())
    setMessage(`선택 ${slugs.length}편 AI 수정 완료`)
    fetchArticles()
  }

  const fixAll = async () => {
    setMessage("")
    const slugs = articles
      .filter((a) => (a._generation_meta?.pass2_issues?.length ?? 0) > 0)
      .map((a) => a.slug)
    if (slugs.length === 0) { setMessage("수정할 이슈가 없습니다"); return }
    await Promise.all(slugs.map(fixArticle))
    setMessage(`전체 ${slugs.length}편 AI 수정 완료`)
    fetchArticles()
  }

  const toggleSelect = (slug: string) => {
    setSelectedSlugs((prev) => {
      const s = new Set(prev)
      if (s.has(slug)) s.delete(slug)
      else s.add(slug)
      return s
    })
  }

  const changeStatus = async (slug: string, status: string) => {
    const res = await fetch("/api/admin/drafts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ slug, status }),
    })
    if (res.ok) {
      setMessage(`${slug} → ${STATUS_LABELS[status]}`)
      fetchArticles()
    }
  }

  const filtered = filter === "all" ? articles : articles.filter((a) => a.status === filter)
  const scheduled = articles.filter((a) => a.scheduled_publish_at)

  return (
    <div>
      <StatsPanel secret={secret} />

      {LEVEL2_ENABLED && (
        <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
          <h3 className="text-sm font-bold text-purple-800 mb-2">
            Level 2 — 예약 발행 큐 ({scheduled.length}건)
          </h3>
          {scheduled.length === 0 ? (
            <p className="text-xs text-purple-600">예약된 글이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {scheduled.map((a) => (
                <li key={a.slug} className="flex items-center justify-between text-sm bg-white rounded px-3 py-2">
                  <span>
                    {a.title} — {a.scheduled_publish_at && new Date(a.scheduled_publish_at).toLocaleString("ko-KR")} 발행 예정
                  </span>
                  <button
                    onClick={() => cancelSchedule(a.slug)}
                    className="text-xs text-red-600 border border-red-300 px-2 py-1 rounded hover:bg-red-50"
                  >
                    회수
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-purple-500 mt-2">
            {/* 실제 발행 트리거(cron 등)는 이 범위 밖 — 큐 등록/회수 UI와 데이터 필드까지만 구현됨 */}
            등록/회수만 지원하며 자동 발행 트리거는 별도 구현이 필요합니다.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 text-sm">
          {["all", "draft", "review", "published"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded border ${
                filter === s ? "bg-blue-700 text-white border-blue-700" : "border-gray-300 hover:border-blue-400"
              }`}
            >
              {s === "all" ? `전체 (${articles.length})` : `${STATUS_LABELS[s]} (${articles.filter((a) => a.status === s).length})`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {selectedSlugs.size > 0 && (
            <button
              onClick={fixSelected}
              disabled={fixingSlugs.size > 0}
              className="text-xs bg-orange-500 text-white px-3 py-1.5 rounded hover:bg-orange-600 disabled:opacity-50"
            >
              선택 AI 수정 ({selectedSlugs.size})
            </button>
          )}
          <button
            onClick={fixAll}
            disabled={fixingSlugs.size > 0}
            className="text-xs bg-orange-600 text-white px-3 py-1.5 rounded hover:bg-orange-700 disabled:opacity-50"
          >
            {fixingSlugs.size > 0 ? `수정 중... (${fixingSlugs.size})` : "전체 AI 수정"}
          </button>
          <button onClick={fetchArticles} className="text-xs text-gray-500 hover:text-blue-700">
            새로고침
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded text-sm">
          {message}
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-center py-16">로딩 중...</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((a) => (
            <div key={a.slug} className="border rounded-lg p-5">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 shrink-0"
                  checked={selectedSlugs.has(a.slug)}
                  onChange={() => toggleSelect(a.slug)}
                />
                <div className="flex flex-1 items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_COLORS[a.status]}`}>
                      {STATUS_LABELS[a.status]}
                    </span>
                    <span className="text-xs text-gray-400">{a.category}</span>
                    {a.article_type && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {a.article_type === "experience" ? "경험형" : "정보형"}
                      </span>
                    )}
                    {a.validation && !a.validation.passed && (
                      <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded font-medium">
                        ⛔ 검증 실패
                      </span>
                    )}
                    {a.review_meta && (
                      <span className={`text-xs px-2 py-0.5 rounded ${a.review_meta.human_action === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {a.review_meta.human_action === "approved" ? "승인됨" : `반려됨${a.review_meta.rejected_reason ? `: ${a.review_meta.rejected_reason}` : ""}`}
                      </span>
                    )}
                    {(a._generation_meta?.pass2_issues?.length ?? 0) > 0 && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                        ⚠ 팩트체크 이슈 {a._generation_meta!.pass2_issues.length}건
                      </span>
                    )}
                  </div>
                  <h2 className="font-semibold text-gray-900">{a.title}</h2>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{a.summary}</p>
                  {(a._generation_meta?.pass2_issues?.length ?? 0) > 0 && (
                    <ul className="mt-2 text-xs text-red-600 space-y-1">
                      {a._generation_meta!.pass2_issues.map((issue, i) => (
                        <li key={i}>• {issue}</li>
                      ))}
                    </ul>
                  )}
                  {a.validation && a.validation.issues.length > 0 && (
                    <ul className="mt-2 text-xs text-red-600 space-y-1">
                      {a.validation.issues.map((issue, i) => (
                        <li key={`v-${i}`}>• [기계검증] {issue}</li>
                      ))}
                    </ul>
                  )}
                  {a.review_report && (
                    <div className="mt-2">
                      <button
                        onClick={() => toggleReport(a.slug)}
                        className="text-xs text-blue-700 hover:underline"
                      >
                        {expandedReport.has(a.slug) ? "AI 검수 리포트 접기 ▲" : "AI 검수 리포트 보기 ▼"}
                      </button>
                      {expandedReport.has(a.slug) && (
                        <div className="mt-2 prose prose-sm max-w-none bg-gray-50 border border-gray-200 rounded p-3 text-gray-700">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{a.review_report}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {REVIEW_CHECKLIST.map((item, i) => (
                      <label key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={checklist[a.slug]?.[i] ?? false}
                          onChange={() => toggleChecklistItem(a.slug, i)}
                        />
                        {item}
                      </label>
                    ))}
                  </div>
                  {rejectingSlug === a.slug && (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        autoFocus
                        placeholder="반려 사유 입력"
                        className="flex-1 border rounded px-2 py-1 text-xs"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && submitReview(a.slug, "rejected", rejectReason)}
                      />
                      <button
                        onClick={() => submitReview(a.slug, "rejected", rejectReason)}
                        className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                      >
                        반려 확정
                      </button>
                      <button
                        onClick={() => { setRejectingSlug(null); setRejectReason("") }}
                        className="text-xs text-gray-500 px-2 py-1"
                      >
                        취소
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    업데이트: {new Date(a.updated_at).toLocaleString("ko-KR")}
                  </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <a
                    href={`/admin/preview/${a.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-700 border border-blue-300 px-3 py-1 rounded hover:bg-blue-50 text-center"
                  >
                    미리보기
                  </a>
                  {(a._generation_meta?.pass2_issues?.length ?? 0) > 0 && (
                    <button
                      onClick={() => fixArticle(a.slug)}
                      disabled={fixingSlugs.has(a.slug)}
                      className="text-xs bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600 disabled:opacity-50"
                    >
                      {fixingSlugs.has(a.slug) ? "수정 중..." : "AI 수정"}
                    </button>
                  )}
                  <button
                    onClick={() => submitReview(a.slug, "approved")}
                    className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                  >
                    승인 기록
                  </button>
                  <button
                    onClick={() => { setRejectingSlug(a.slug); setRejectReason("") }}
                    className="text-xs bg-white text-red-600 border border-red-300 px-3 py-1 rounded hover:bg-red-50"
                  >
                    반려 기록
                  </button>
                  {LEVEL2_ENABLED && a.article_type === "info" && a.validation?.passed && !a.scheduled_publish_at && a.status !== "published" && (
                    <button
                      onClick={() => schedulePublish(a.slug)}
                      className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
                    >
                      48시간 후 예약 발행
                    </button>
                  )}
                  <button
                    onClick={() => changeStatus(a.slug, STATUS_NEXT[a.status])}
                    disabled={STATUS_NEXT[a.status] === "published" && a.validation?.passed === false}
                    title={STATUS_NEXT[a.status] === "published" && a.validation?.passed === false ? "기계 검증 실패 — 발행 불가" : undefined}
                    className="text-xs bg-blue-700 text-white px-3 py-1 rounded hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {STATUS_NEXT_LABEL[a.status]}
                  </button>
                </div>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-gray-400 text-center py-16">글이 없습니다.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── 초안 생성 탭 ─────────────────────────────────────────
function GenerateTab({ secret }: { secret: string }) {
  const [configs, setConfigs] = useState<Config[]>([])
  const [jobs, setJobs] = useState<Record<string, Job>>({}) // slug → latest job
  const [apiOnline, setApiOnline] = useState<boolean | null>(null)
  const [generatingAll, setGeneratingAll] = useState(false)

  // FastAPI 상태 확인
  useEffect(() => {
    fetch(`${FASTAPI_URL}/health`)
      .then((r) => r.ok && setApiOnline(true))
      .catch(() => setApiOnline(false))
  }, [])

  // configs 목록 로드
  useEffect(() => {
    if (!apiOnline) return
    fetch(`${FASTAPI_URL}/configs`, {
      headers: { "x-admin-secret": secret },
    })
      .then((r) => r.json())
      .then(setConfigs)
      .catch(() => {})
  }, [apiOnline, secret])

  // job 폴링 (running/pending 상태인 것만)
  useEffect(() => {
    const running = Object.values(jobs).filter(
      (j) => j.status === "pending" || j.status === "running"
    )
    if (running.length === 0) return

    const timer = setInterval(async () => {
      for (const job of running) {
        const res = await fetch(`${FASTAPI_URL}/jobs/${job.job_id}`, {
          headers: { "x-admin-secret": secret },
        })
        if (res.ok) {
          const updated: Job = await res.json()
          setJobs((prev) => ({ ...prev, [job.slug]: { ...updated, job_id: job.job_id } }))
        }
      }
    }, 2000)

    return () => clearInterval(timer)
  }, [jobs, secret])

  const generateOne = async (slug: string) => {
    const res = await fetch(`${FASTAPI_URL}/generate/${slug}`, {
      method: "POST",
      headers: { "x-admin-secret": secret },
    })
    if (res.ok) {
      const data = await res.json()
      setJobs((prev) => ({
        ...prev,
        [slug]: { job_id: data.job_id, slug, status: "pending", log: [] },
      }))
    }
  }

  const generateAll = async () => {
    setGeneratingAll(true)
    const res = await fetch(`${FASTAPI_URL}/generate/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ slugs: null }),
    })
    if (res.ok) {
      const data = await res.json()
      const newJobs: Record<string, Job> = {}
      for (const item of data.jobs) {
        newJobs[item.slug] = { job_id: item.job_id, slug: item.slug, status: "pending", log: [] }
      }
      setJobs((prev) => ({ ...prev, ...newJobs }))
    }
    setGeneratingAll(false)
  }

  const jobStatusBadge = (slug: string) => {
    const job = jobs[slug]
    if (!job) return null
    const colors: Record<string, string> = {
      pending: "bg-gray-100 text-gray-600",
      running: "bg-yellow-100 text-yellow-700",
      done: "bg-green-100 text-green-700",
      failed: "bg-red-100 text-red-700",
    }
    const labels: Record<string, string> = {
      pending: "대기중",
      running: "생성중...",
      done: "완료",
      failed: "실패",
    }
    return (
      <span className={`text-xs px-2 py-0.5 rounded font-medium ${colors[job.status]}`}>
        {labels[job.status]}
      </span>
    )
  }

  if (apiOnline === null) {
    return <p className="text-gray-400 text-center py-16">FastAPI 서버 확인 중...</p>
  }

  if (apiOnline === false) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 font-medium mb-2">FastAPI 서버에 연결할 수 없습니다</p>
        <p className="text-sm text-gray-500">
          <code className="bg-gray-100 px-2 py-1 rounded">cd backend && uvicorn main:app --reload --port 8000</code>
        </p>
        <p className="text-xs text-gray-400 mt-2">서버 주소: {FASTAPI_URL}</p>
      </div>
    )
  }

  const CATEGORY_ORDER = ["소득_지원", "청년_주거", "세금_행정"]
  const grouped = CATEGORY_ORDER.reduce<Record<string, Config[]>>((acc, cat) => {
    acc[cat] = configs.filter((c) => c.category === cat)
    return acc
  }, {})
  const CATEGORY_LABELS: Record<string, string> = {
    소득_지원: "소득·지원",
    청년_주거: "청년·주거",
    세금_행정: "세금·행정",
  }

  const runningCount = Object.values(jobs).filter(
    (j) => j.status === "pending" || j.status === "running"
  ).length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          총 {configs.length}편 · YAML 설정 기반으로 Claude API 2-pass 초안 생성
        </p>
        <button
          onClick={generateAll}
          disabled={generatingAll || runningCount > 0}
          className="text-sm bg-blue-700 text-white px-4 py-1.5 rounded hover:bg-blue-800 disabled:opacity-50"
        >
          {runningCount > 0 ? `생성중 (${runningCount}건)` : "전체 생성"}
        </button>
      </div>

      {CATEGORY_ORDER.map((cat) => (
        <div key={cat} className="mb-8">
          <h2 className="text-base font-bold text-gray-700 mb-3 border-b pb-2">
            {CATEGORY_LABELS[cat]} ({grouped[cat]?.length ?? 0}편)
          </h2>
          <div className="space-y-2">
            {(grouped[cat] ?? []).map((config) => {
              const job = jobs[config.slug]
              return (
                <div key={config.slug} className="flex items-center justify-between border rounded-lg px-4 py-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{config.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{config.slug}</p>
                    {job?.log && job.log.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">{job.log[job.log.length - 1]}</p>
                    )}
                    {job?.status === "failed" && (
                      <p className="text-xs text-red-500 mt-1">{job.error}</p>
                    )}
                    {job?.status === "done" && job.result && (
                      <p className={`text-xs mt-1 ${job.result.pass2_approved ? "text-green-600" : "text-red-500"}`}>
                        {job.result.pass2_approved
                          ? "팩트체크 통과"
                          : `팩트체크 이슈 ${job.result.pass2_issues.length}건`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {jobStatusBadge(config.slug)}
                    <button
                      onClick={() => generateOne(config.slug)}
                      disabled={job?.status === "pending" || job?.status === "running"}
                      className="text-xs border border-blue-300 text-blue-700 px-3 py-1 rounded hover:bg-blue-50 disabled:opacity-50"
                    >
                      {job?.status === "done" ? "재생성" : "생성"}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 메인 Admin 페이지 ─────────────────────────────────────
export default function AdminPage() {
  const [secret, setSecret] = useState("")
  const [authed, setAuthed] = useState(false)
  const [tab, setTab] = useState<"review" | "generate">("review")

  if (!authed) {
    return <LoginScreen onLogin={(s) => { setSecret(s); setAuthed(true) }} />
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin</h1>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg text-sm">
          <button
            onClick={() => setTab("review")}
            className={`px-4 py-1.5 rounded-md transition-colors ${tab === "review" ? "bg-white shadow font-medium" : "text-gray-500 hover:text-gray-700"}`}
          >
            검수
          </button>
          <button
            onClick={() => setTab("generate")}
            className={`px-4 py-1.5 rounded-md transition-colors ${tab === "generate" ? "bg-white shadow font-medium" : "text-gray-500 hover:text-gray-700"}`}
          >
            초안 생성
          </button>
        </div>
      </div>

      {tab === "review" ? <ReviewTab secret={secret} /> : <GenerateTab secret={secret} />}
    </div>
  )
}
