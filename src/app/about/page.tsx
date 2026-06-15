export const metadata = {
  title: "소개",
  description: "정책정보 사이트 소개 및 운영 방침",
}

export default function AboutPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">소개</h1>
      <div className="prose prose-sm text-gray-700 space-y-4">
        <p>
          <strong>정책정보</strong>는 정부 제도·지원금·행정 정보를 공식 출처 기반으로 정확하게 안내하는 사이트입니다.
        </p>
        <h2 className="text-lg font-semibold mt-6">정보 검증 과정</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>공공데이터포털(data.go.kr), 복지로(bokjiro.go.kr) 공식 API에서 원천 데이터를 수집합니다.</li>
          <li>수집된 데이터를 스키마로 정규화한 뒤, 검수자가 공식 출처와 1:1 대조합니다.</li>
          <li>제도 변경이 감지되면 해당 글을 즉시 갱신합니다.</li>
          <li>각 글에는 공식 출처 링크가 반드시 포함됩니다.</li>
        </ul>
        <h2 className="text-lg font-semibold mt-6">운영자</h2>
        <p>데이터 엔지니어링 경력의 운영자가 공공데이터 파이프라인을 직접 설계·운영합니다.</p>
        <p className="text-sm text-gray-500 mt-6">
          본 사이트의 정보는 정확성을 위해 노력하지만, 제도 변경에 따라 달라질 수 있습니다.
          중요한 결정 전 반드시 공식 출처를 최종 확인하시기 바랍니다.
        </p>
      </div>
    </div>
  )
}
