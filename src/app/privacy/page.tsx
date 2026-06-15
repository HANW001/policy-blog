export const metadata = { title: "개인정보처리방침" }

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl prose prose-sm text-gray-700">
      <h1 className="text-2xl font-bold mb-6">개인정보처리방침</h1>
      <p>정책정보(이하 "본 사이트")는 이용자의 개인정보를 중요하게 여깁니다.</p>
      <h2>수집하는 정보</h2>
      <p>본 사이트는 별도의 회원가입 없이 이용 가능하며, 이용자의 개인정보를 직접 수집하지 않습니다.</p>
      <h2>광고 및 쿠키</h2>
      <p>
        본 사이트는 Google AdSense를 통해 광고를 게재합니다. Google은 쿠키를 사용하여 이용자에게 맞춤 광고를 제공할 수 있습니다.
        자세한 내용은{" "}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
          Google 개인정보처리방침
        </a>
        을 참조하세요.
      </p>
      <h2>방문 통계</h2>
      <p>본 사이트는 Google Search Console 및 Google Analytics를 통해 익명화된 방문 통계를 수집할 수 있습니다.</p>
      <h2>문의</h2>
      <p>개인정보 관련 문의: mosadi1216@gmail.com</p>
      <p className="text-xs text-gray-400">최종 업데이트: 2026년 6월 13일</p>
    </div>
  )
}
