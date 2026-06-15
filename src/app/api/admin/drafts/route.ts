import { type NextRequest, NextResponse } from "next/server"
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
        status: 1,
        published_at: 1,
        updated_at: 1,
        summary: 1,
        _generation_meta: 1,
      },
    })
    .sort({ updated_at: -1 })
    .toArray()

  return NextResponse.json(articles)
}

// PATCH /api/admin/drafts — 상태 변경
// body: { slug: string, status: "draft" | "review" | "published" }
export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json() as { slug?: string; status?: string }
  const { slug, status } = body

  if (!slug || !["draft", "review", "published"].includes(status ?? "")) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 })
  }

  const db = await getDb()
  const result = await db.collection("policy_articles").updateOne(
    { slug },
    { $set: { status, updated_at: new Date().toISOString() } }
  )

  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true, slug, status })
}
