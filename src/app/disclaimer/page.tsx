export const metadata = { title: "면책고지" }

export default function DisclaimerPage() {
  return (
    <div className="max-w-2xl prose prose-sm text-gray-700">
      <h1 className="text-2xl font-bold mb-6">면책고지</h1>
      <p>
        본 사이트에서 제공하는 정부 제도·지원금·행정 정보는 공공데이터 및 공식 기관 자료를 기반으로 작성되었습니다.
        그러나 제도는 정부 정책에 따라 변경될 수 있으며, 본 사이트의 정보가 최신 상태가 아닐 수 있습니다.
      </p>
      <ul>
        <li>본 사이트의 정보는 참고용이며, 법적 효력이 없습니다.</li>
        <li>신청 전 반드시 해당 기관의 공식 사이트에서 최신 내용을 확인하시기 바랍니다.</li>
        <li>본 사이트의 정보를 이용하여 발생하는 손해에 대해 운영자는 책임지지 않습니다.</li>
      </ul>
      <p>각 글에는 공식 출처 링크가 포함되어 있으니 반드시 확인 후 이용해 주세요.</p>
    </div>
  )
}
