import { getDb } from "./mongodb"

export interface PolicyArticle {
  _id?: string
  slug: string
  title: string
  category: "소득_지원" | "청년_주거" | "세금_행정" | "복지"
  cluster: string
  content: string
  summary: string
  faq_items: { question: string; answer: string }[]
  key_facts: {
    지원대상?: string
    지원금액?: string
    신청기간?: string
    신청방법?: string
    출처URL?: string
  }
  source_url: string
  published_at: string
  updated_at: string
  status: "draft" | "review" | "published"
  view_count: number
  // content-api Pass 4 / Level 1 검수 필드 (선택 — 구 문서에는 없을 수 있음)
  review_report?: string
  validation?: { passed: boolean; issues: string[] }
  article_type?: "info" | "experience"
  // Admin 검수자가 승인/반려 시 기록
  review_meta?: {
    human_action: "approved" | "rejected"
    rejected_reason?: string
    reviewed_at: string
  }
  // Level 2 예약 발행 큐 (기능 플래그 활성화 시에만 사용)
  scheduled_publish_at?: string
  // 필러/클러스터 구조 (content-api 클러스터 A·B부터 사용 — 구 문서에는 없을 수 있음)
  article_role?: "pillar" | "cluster"
  pillar_slug?: string
}

export async function getArticles(options?: {
  category?: string
  limit?: number
  skip?: number
}): Promise<PolicyArticle[]> {
  try {
    const db = await getDb()
    const query: Record<string, unknown> = { status: "published" }
    if (options?.category) query.category = options.category
    return db
      .collection("policy_articles")
      .find(query)
      .sort({ published_at: -1 })
      .skip(options?.skip ?? 0)
      .limit(options?.limit ?? 20)
      .toArray() as unknown as PolicyArticle[]
  } catch {
    return []
  }
}

export async function getArticleBySlug(slug: string): Promise<PolicyArticle | null> {
  try {
    const db = await getDb()
    return db
      .collection("policy_articles")
      .findOne({ slug, status: "published" }) as unknown as PolicyArticle | null
  } catch {
    return null
  }
}

export async function getArticleBySlugAdmin(slug: string): Promise<PolicyArticle | null> {
  try {
    const db = await getDb()
    return db.collection("policy_articles").findOne({ slug }) as unknown as PolicyArticle | null
  } catch {
    return null
  }
}

export async function getArticlesByCluster(cluster: string, excludeSlug: string): Promise<PolicyArticle[]> {
  try {
    const db = await getDb()
    return db
      .collection("policy_articles")
      .find({ cluster, status: "published", slug: { $ne: excludeSlug } })
      .limit(5)
      .toArray() as unknown as PolicyArticle[]
  } catch {
    return []
  }
}

export async function getArticlesByPillar(pillarSlug: string, excludeSlug: string): Promise<PolicyArticle[]> {
  try {
    const db = await getDb()
    return db
      .collection("policy_articles")
      .find({ pillar_slug: pillarSlug, status: "published", slug: { $ne: excludeSlug } })
      .sort({ published_at: -1 })
      .limit(15)
      .toArray() as unknown as PolicyArticle[]
  } catch {
    return []
  }
}

export async function searchArticles(q: string): Promise<PolicyArticle[]> {
  try {
    const db = await getDb()
    return db
      .collection("policy_articles")
      .find({
        status: "published",
        $or: [
          { title: { $regex: q, $options: "i" } },
          { summary: { $regex: q, $options: "i" } },
        ],
      })
      .limit(20)
      .toArray() as unknown as PolicyArticle[]
  } catch {
    return []
  }
}

export async function getAllPublishedSlugs(): Promise<string[]> {
  try {
    const db = await getDb()
    const docs = await db
      .collection("policy_articles")
      .find({ status: "published" }, { projection: { slug: 1 } })
      .toArray()
    return docs.map((d) => d.slug as string)
  } catch {
    return []
  }
}

export const CATEGORY_LABELS: Record<string, string> = {
  소득_지원: "소득·지원",
  청년_주거: "청년·주거",
  세금_행정: "세금·행정",
  복지: "복지",
}
