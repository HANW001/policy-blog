import { ImageResponse } from "next/og"
import { getArticles, CATEGORY_LABELS } from "@/lib/articles"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const label = CATEGORY_LABELS[slug] ?? slug
  const articles = await getArticles({ category: slug, limit: 50 })

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
      <div style={{ fontSize: 24, background: "rgba(255,255,255,0.2)", padding: "6px 16px", borderRadius: 8, marginBottom: 24 }}>
        정책정보
      </div>
      <div style={{ fontSize: 56, fontWeight: "bold", lineHeight: 1.2, maxWidth: 1000 }}>{label}</div>
      <div style={{ marginTop: 32, fontSize: 24, opacity: 0.8 }}>관련 글 {articles.length}편</div>
    </div>,
    { ...size }
  )
}
