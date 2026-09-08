import { type NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getDb } from "@/lib/mongodb"

function checkAuth(req: NextRequest): boolean {
  const secret = req.headers.get("x-admin-secret")
  return secret === process.env.ADMIN_SECRET
}

// GET /api/admin/drafts — 전체 글 목록 (상태 필터 지원)
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const status = searchParams.get("status") // draft | review | published | null(전체)

  const db = await getDb()
  const query = status ? { status } : {}
  const articles = await db
    .collection("policy_articles")
    .find(query, {
      projection: {
        slug: 1,
        title: 1,
        category: 1,
        cluster: 1,
        status: 1,
        published_at: 1,
        updated_at: 1,
        summary: 1,
        _generation_meta: 1,
        review_report: 1,
        validation: 1,
        article_type: 1,
        review_meta: 1,
        scheduled_publish_at: 1,
      },
    })
    .sort({ updated_at: -1 })
    .toArray()

  return NextResponse.json(articles)
}

// PATCH /api/admin/drafts — 상태 변경 및 검수 메타 기록
// body: {
//   slug: string
//   status?: "draft" | "review" | "published"
//   review_action?: "approved" | "rejected"   // review_meta 기록 (사유는 rejected_reason)
//   rejected_reason?: string
//   scheduled_publish_at?: string | null       // Level 2 예약 발행 큐 등록(string)/회수(null)
// }
export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json()) as {
    slug?: string
    status?: string
    review_action?: "approved" | "rejected"
    rejected_reason?: string
    scheduled_publish_at?: string | null
  }
  const { slug, status, review_action, rejected_reason, scheduled_publish_at } = body

  if (!slug) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 })
  }
  if (status !== undefined && !["draft", "review", "published"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }
  if (review_action !== undefined && !["approved", "rejected"].includes(review_action)) {
    return NextResponse.json({ error: "Invalid review_action" }, { status: 400 })
  }

  const db = await getDb()
  const collection = db.collection("policy_articles")

  const existing = await collection.findOne(
    { slug },
    { projection: { validation: 1, category: 1 } }
  )

  // 기계 검증 실패(validation.passed === false) 글은 발행 차단 — 서버 사이드 가드
  if (status === "published") {
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    if (existing.validation && existing.validation.passed === false) {
      return NextResponse.json(
        { error: "기계 검증 실패 글은 발행할 수 없습니다" },
        { status: 400 }
      )
    }
  }

  const set: Record<string, unknown> = { updated_at: new Date().toISOString() }
  const unset: Record<string, ""> = {}

  if (status !== undefined) set.status = status
  if (review_action !== undefined) {
    set.review_meta = {
      human_action: review_action,
      ...(review_action === "rejected" && rejected_reason ? { rejected_reason } : {}),
      reviewed_at: new Date().toISOString(),
    }
  }
  if (scheduled_publish_at !== undefined) {
    if (scheduled_publish_at === null) unset.scheduled_publish_at = ""
    else set.scheduled_publish_at = scheduled_publish_at
  }

  const update: Record<string, unknown> = { $set: set }
  if (Object.keys(unset).length > 0) update.$unset = unset

  const result = await collection.updateOne({ slug }, update)

  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // status 변경(발행/비공개 전환)은 ISR 캐시된 페이지를 즉시 무효화해야 한다.
  // content-api가 직접 Mongo에 published→review 등을 쓰는 경로는 이 라우트를 거치지 않으므로 커버 못 함(별도 후속 과제).
  if (status !== undefined) {
    revalidatePath(`/articles/${slug}`)
    revalidatePath("/sitemap.xml")
    revalidatePath("/articles")
    revalidatePath("/")
    if (existing?.category) revalidatePath(`/category/${existing.category}`)
  }

  return NextResponse.json({ ok: true, slug, status, review_action, scheduled_publish_at })
}
