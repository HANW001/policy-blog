import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"

function checkAuth(req: NextRequest): boolean {
  const secret = req.headers.get("x-admin-secret")
  return secret === process.env.ADMIN_SECRET
}

// GET /api/admin/stats — AI 검수 통과 글의 사람 반려율 (Level 2 전환 조건 판단용)
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const db = await getDb()
  const collection = db.collection("policy_articles")

  const reviewedCount = await collection.countDocuments({
    "review_meta.human_action": { $exists: true },
  })
  const rejectedCount = await collection.countDocuments({
    "review_meta.human_action": "rejected",
  })

  const rejectionRate = reviewedCount > 0 ? rejectedCount / reviewedCount : 0

  return NextResponse.json({
    reviewedCount,
    rejectedCount,
    rejectionRate,
    level2Eligible: reviewedCount > 0 && rejectionRate < 0.1,
  })
}
