import { ImageResponse } from "next/og"
import { CATEGORY_LABELS } from "@/lib/articles"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function OgImage() {
  const categories = Object.values(CATEGORY_LABELS)

  return new ImageResponse(
    <div
      style={{
        background: "#1d4ed8",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "60px",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontSize: 64, fontWeight: "bold", lineHeight: 1.2 }}>정책정보</div>
      <div style={{ marginTop: 20, fontSize: 28, opacity: 0.85, maxWidth: 1000 }}>
        정부 제도·지원금·행정 정보를 공식 출처 기반으로 안내합니다
      </div>
      <div style={{ marginTop: 40, display: "flex", gap: 12 }}>
        {categories.map((label) => (
          <div
            key={label}
            style={{ fontSize: 22, background: "rgba(255,255,255,0.2)", padding: "8px 20px", borderRadius: 8 }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>,
    { ...size }
  )
}
