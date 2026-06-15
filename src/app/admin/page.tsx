"use client"
import { useEffect, useState, useCallback } from "react"

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
interface Article {
  slug: string
  title: string
  category: string
  status: string
  summary: string
  updated_at: string
  _generation_meta?: GenerationMeta
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

// ── 검수 탭 ──────────────────────────────────────────────
function ReviewTab({ secret }: { secret: string }) {
  const [articles, setArticles] = useState<Article[]>([])
  const [filter, setFilter] = useState("all")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [fixingSlugs, setFixingSlugs] = useState<Set<string>>(new Set())
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set())

  const fetchArticles = useCallback(async () => {
    setLoading(true)
    const url =
      filter === "all" ? "/api/admin/drafts" : `/api/admin/drafts?status=${filter}`
    const res = await fetch(url, { headers: { "x-admin-secret": secret } })
    if (res.ok) setArticles(await res.json())
    setLoading(false)
  }, [filter, secret])

  useEffect(() => { fetchArticles() }, [fetchArticles])

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

  return (
    <div>
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
                    onClick={() => changeStatus(a.slug, STATUS_NEXT[a.status])}
                    className="text-xs bg-blue-700 text-white px-3 py-1 rounded hover:bg-blue-800"
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
