"use client"
import { useEffect } from "react"

declare global {
  interface Window {
    adsbygoogle: unknown[]
  }
}

export default function AdUnit({ slot, format = "auto" }: { slot: string; format?: string }) {
  useEffect(() => {
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {}
  }, [])

  const clientId = process.env.NEXT_PUBLIC_ADSENSE_ID
  if (!clientId) return null

  return (
    <div className="my-6 text-center">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}
