# policy-blog CLAUDE.md

Next.js 16 App Router 정부 제도·지원금 정보 블로그.
MongoDB Atlas `policy_db`에서 데이터를 읽어 표시. AdSense 수익화.
AI 초안 생성은 content-api(FastAPI)가 담당. 블로그는 읽기 전용.

## 빌드 명령어

```bash
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
  api/admin/drafts/route.ts       → GET 목록 / PATCH 상태변경·승인/반려·예약발행 (검증 실패 글 발행은 서버에서 400 차단)
  api/admin/stats/route.ts        → GET 반려율 집계 (reviewedCount, rejectedCount, rejectionRate, level2Eligible)
  sitemap.ts                      → 동적 사이트맵 (published 글 전체)
  robots.ts                       → robots.txt
src/middleware.ts                 → /admin, /api/admin/* 프로덕션 차단 (NODE_ENV=production → 404)
```

## 핵심 라이브러리 (src/lib/)

```
articles.ts        → DB 쿼리 함수 + PolicyArticle 인터페이스
mongodb.ts         → MongoDB 연결 싱글톤 (getDb() → policy_db)
author.ts          → 저자 닉네임·이력 단일 관리 (현재 [TODO] 플레이스홀더 — 바이라인·JSON-LD에서 사용)
featureFlags.ts    → LEVEL2_ENABLED (NEXT_PUBLIC_LEVEL2_ENABLED === "true", 기본 false)
reviewChecklist.ts → 검수 체크리스트 6항목 상수 (docs/검수-체크리스트.md와 동일)
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
view_count, _generation_meta{},
article_type("info"|"experience"),        ← content-api가 personal_notes 유무로 설정
review_report(markdown),                  ← Pass 4 AI 검수 리포트
validation{passed, issues[]},             ← 기계 검증 결과. passed=false면 발행 불가
review_meta{human_action, rejected_reason?, reviewed_at},  ← admin 승인/반려 기록
scheduled_publish_at                      ← Level 2 예약 발행 시각 (회수 시 null)
```

`article_type`/`review_report`/`validation`은 content-api가 쓰고, `review_meta`/`scheduled_publish_at`은 admin API가 쓴다. 필드명은 content-api/CLAUDE.md의 계약 표와 고정 동기화.

카테고리: `소득_지원` | `청년_주거` | `세금_행정` | `복지`

## Admin 워크플로우

```
content-api → MongoDB(draft) → /admin 검수 탭 → 발행
```

- **로컬 전용** — 프로덕션(Vercel)에서 `/admin`은 미들웨어가 404 반환
- 로컬 `npm run dev` → `http://localhost:3001/admin` → ADMIN_SECRET 입력
- "검수" 탭 (Level 1): AI 검수 리포트(review_report)·기계 검증 이슈 표시 + 체크리스트 6항목 + 승인/반려(사유 입력 → review_meta 저장) + draft → review → published 상태 전환
- `validation.passed=false` 글은 "검증 실패" 배지 + 발행 버튼 비활성화 + **서버 사이드에서도 발행 차단(400)**
- 상단 StatsPanel: 반려율 % 표시 — Level 2 전환 조건(애드센스 승인 + 반려율 10% 미만)
- Level 2 (LEVEL2_ENABLED=true일 때만): 정보형(article_type=info)·검증 통과 글에 "48시간 후 예약 발행" 버튼 + 예약 큐 패널(회수 가능). 실제 발행 cron 트리거는 미구현
- "초안 생성" 탭: content-api(localhost:8000) 호출 → 생성 상태 폴링
- 검수 절차 상세: `docs/검수-체크리스트.md` 참조

## 환경변수 (.env.local)

```
MONGODB_URI=
NEXT_PUBLIC_ADSENSE_ID=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
ADMIN_SECRET=
NEXT_PUBLIC_LEVEL2_ENABLED=      # "true"일 때만 Level 2 예약 발행 UI 활성화 (기본 미설정=off)
```

## 절대 규칙

- `.env.local` 직접 읽기 금지
- DB는 읽기 전용 — 쓰기는 content-api가 담당 (admin 상태변경 제외)
- `getDb()` 싱글톤 사용
- AdSense slot ID는 컴포넌트에 하드코딩 허용
- 검수 없는 발행 금지 — status=published는 반드시 사람이 Admin에서 직접 변경
- Admin은 로컬 전용 — `src/middleware.ts`가 프로덕션에서 /admin 전체 차단
