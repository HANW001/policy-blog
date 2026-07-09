// 저자 정보 단일 관리 지점. 실명·구체 이력은 사용자가 직접 채워야 하므로
// 임시로 [TODO] 플레이스홀더를 넣어둔다 — AI가 이력을 지어내지 않는다.
export const AUTHOR = {
  name: "[TODO: 닉네임]",
  description: "[TODO: 이력 — 예: 직장생활 n년차, 근로장려금·연말정산 직접 신청 경험]",
}

// 감수자 정보. Level 1 검수(admin 승인)를 수행하는 사람을 가리키며,
// 글 상세의 "검토: [이름] · [날짜]" 블록과 reviewedBy JSON-LD에서 사용한다.
// 날짜는 저자와 달리 글마다 다르므로(article.review_meta.reviewed_at) 여기서는 이름만 관리한다.
export const REVIEWER = {
  name: "[TODO: 감수자 닉네임]",
  description: "[TODO: 감수자 이력 — 예: 세무/노무 실무 경험 n년]",
}
