# policy-blog CLAUDE.md

Next.js 16 App Router 정부 제도·지원금 정보 블로그.
MongoDB Atlas `policy_db`에서 데이터를 읽어 표시. AdSense 수익화.
AI 초안 생성은 content-api(FastAPI)가 담당. 블로그는 읽기 전용.

## 빌드 명령어

```bash
cd policy-blog
npm install
npm run dev          # 개발 서버 (포트 3001)
npx tsc --noEmit     # 타입 체크
npm run build        # 프로덕션 빌드
```

## 기술 스택

| 역할 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 App Router (Server Components 기본) |
| 배포 | Vercel |
| DB | MongoDB Atlas — `policy_db`, `policy_articles` 컬렉션 |
| 스타일 | Tailwind CSS 4 |
| 광고 | Google AdSense |
| 타입 | TypeScript strict |

## 라우트 구조

```
src/app/
  page.tsx                        → 홈 (최신글 + 카테고리별 추천)
  articles/
    page.tsx                      → 전체 글 목록 + ?q= 검색 (revalidate: 3600)
    [slug]/page.tsx               → 글 상세 (Article+FAQPage+BreadcrumbList JSON-LD)
    [slug]/opengraph-image.tsx    → OG 이미지 자동 생성
  category/[slug]/page.tsx        → 카테고리 글 목록 (revalidate: 3600)
  about/page.tsx                  → 저자/사이트 소개 (E-E-A-T 신호)
  contact/page.tsx                → 연락처
  privacy/page.tsx                → 개인정보처리방침
  disclaimer/page.tsx             → 면책고지
  admin/page.tsx                  → 초안 검수·발행 Admin UI (Client Component)
  admin/preview/[slug]/page.tsx   → Admin 미리보기 (Server Component, 발행 전 글 포함)
  api/admin/drafts/route.ts       → GET 목록 / PATCH 상태변경
  sitemap.ts                      → 동적 사이트맵 (published 글 전체)
  robots.ts                       → robots.txt
```

## 핵심 라이브러리 (src/lib/)

```
articles.ts   → DB 쿼리 함수 + PolicyArticle 인터페이스
mongodb.ts    → MongoDB 연결 싱글톤 (getDb() → policy_db)
```

주요 함수: `getArticles`, `getArticleBySlug`, `getArticleBySlugAdmin`,
`getArticlesByCluster`, `searchArticles`, `getAllPublishedSlugs`

**`getArticleBySlugAdmin`**: status 필터 없이 slug만으로 조회 (Admin 미리보기용)  
**Korean slug 주의**: `<a href>` 직접 이동 시 Next.js가 params를 자동 디코딩하지 않음.
동적 라우트 page.tsx에서 `decodeURIComponent(params.slug)` 필수.

## 컴포넌트 (src/components/)

| 컴포넌트 | 역할 |
|---------|------|
| `ArticleCard` | 글 목록 카드 |
| `FaqSection` | FAQ 아코디언 (FAQPage JSON-LD 연동) |
| `JsonLd` | `<script type="application/ld+json">` 삽입 |
| `AdUnit` | AdSense 광고 유닛 (slot: SLOT_TOP / SLOT_MID / SLOT_BOTTOM) |
| `KeyFacts` | 핵심 정보 하이라이트 박스 (지원금액·기간 강조) |
| `ClusterNav` | 같은 클러스터 글 내부 링크 |
| `Breadcrumb` | BreadcrumbList JSON-LD + UI |

## MongoDB 스키마 (`policy_articles`)

```
slug, title, category, cluster, content(markdown),
summary, faq_items[], key_facts{}, source_url,
published_at, updated_at, status(draft|review|published),
view_count, _generation_meta{}
```

카테고리: `소득_지원` | `청년_주거` | `세금_행정` | `복지`

## Admin 워크플로우

```
content-api → MongoDB(draft) → /admin 검수 탭 → 발행
```

- `/admin` → ADMIN_SECRET 입력
- "검수" 탭: draft → review → published 상태 전환
- "초안 생성" 탭: content-api(localhost:8000) 호출 → 생성 상태 폴링

## 환경변수 (.env.local)

```
MONGODB_URI=
NEXT_PUBLIC_ADSENSE_ID=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
ADMIN_SECRET=
```

## 절대 규칙

- `.env.local` 직접 읽기 금지
- DB는 읽기 전용 — 쓰기는 content-api가 담당 (admin 상태변경 제외)
- `getDb()` 싱글톤 사용
- AdSense slot ID는 컴포넌트에 하드코딩 허용
- 검수 없는 발행 금지 — status=published는 반드시 사람이 Admin에서 직접 변경
