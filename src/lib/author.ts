// 저자 정보 단일 관리 지점.
export const AUTHOR = {
  name: "정책노트 김대리",
  description: "AI(Claude)가 공식 출처를 조사해 초안을 작성하고, 사람이 검수해 정리합니다.",
}

// 감수자 정보. Level 1 검수(admin 승인)를 수행하는 사람을 가리키며,
// 글 상세의 "검토: [이름] · [날짜]" 블록과 reviewedBy JSON-LD에서 사용한다.
// 날짜는 저자와 달리 글마다 다르므로(article.review_meta.reviewed_at) 여기서는 이름만 관리한다.
export const REVIEWER = {
  name: "정책노트 검수",
  description: "제도 변경 사항과 신청 조건을 최신 공고 기준으로 확인합니다.",
}
