// Level 2(정보형 글 48시간 예약 발행 큐) 기능 플래그.
// 애드센스 승인 + Level 1 기간 반려율 10% 미만일 때만 사용자가 직접 true로 전환한다.
export const LEVEL2_ENABLED = process.env.NEXT_PUBLIC_LEVEL2_ENABLED === "true"
