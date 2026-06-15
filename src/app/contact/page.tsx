export const metadata = { title: "연락처" }

export default function ContactPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-6">연락처</h1>
      <p className="text-gray-700">
        오류 신고, 정보 수정 요청, 기타 문의는 아래 이메일로 보내주세요.
      </p>
      <p className="mt-4 text-blue-700 font-medium">mosadi1216@gmail.com</p>
      <p className="mt-6 text-sm text-gray-500">
        제도 정보의 오류를 발견하셨다면 출처 URL과 함께 알려주시면 빠르게 수정하겠습니다.
      </p>
    </div>
  )
}
