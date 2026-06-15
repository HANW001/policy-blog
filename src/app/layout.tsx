import type { Metadata } from "next"
import "./globals.css"
import Link from "next/link"
import Script from "next/script"

export const metadata: Metadata = {
  title: {
    default: "정책정보 — 정부 제도·지원금 안내",
    template: "%s | 정책정보",
  },
  description: "정부 제도, 지원금, 행정 정보를 쉽고 정확하게 안내합니다.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com"),
}

const navLinks = [
  { href: "/", label: "홈" },
  { href: "/category/소득_지원", label: "소득·지원" },
  { href: "/category/청년_주거", label: "청년·주거" },
  { href: "/category/세금_행정", label: "세금·행정" },
  { href: "/category/복지", label: "복지" },
]

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "정책정보",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com"}/articles?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID

  return (
    <html lang="ko">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        {adsenseId && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseId}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </head>
      <body className="bg-white text-gray-900 antialiased">
        <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold text-blue-700 hover:text-blue-800">
              정책정보
            </Link>
            <nav className="flex gap-4 text-sm">
              {navLinks.slice(1).map((l) => (
                <Link key={l.href} href={l.href} className="text-gray-600 hover:text-blue-700">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
        <footer className="border-t border-gray-200 bg-gray-50 py-8 text-center text-sm text-gray-500">
          <div className="flex justify-center gap-6">
            <Link href="/about" className="hover:text-blue-700">소개</Link>
            <Link href="/contact" className="hover:text-blue-700">연락처</Link>
            <Link href="/privacy" className="hover:text-blue-700">개인정보처리방침</Link>
            <Link href="/disclaimer" className="hover:text-blue-700">면책고지</Link>
          </div>
          <p className="mt-4">© {new Date().getFullYear()} 정책정보. 본 사이트의 정보는 공식 출처를 기반으로 하나 변경될 수 있습니다.</p>
        </footer>
      </body>
    </html>
  )
}
