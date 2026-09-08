"use client"
import { useState } from "react"

export default function FaqSection({ items }: { items: { question: string; answer: string }[] }) {
  const [open, setOpen] = useState<number | null>(null)
  if (!items || items.length === 0) return null
  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-gray-900 mb-3">자주 묻는 질문</h2>
      <div className="divide-y divide-gray-200 border border-gray-200 rounded-md">
        {items.map((item, i) => (
          <div key={i}>
            <button
              className="w-full text-left px-5 py-3.5 text-base font-medium text-gray-800 hover:bg-gray-50 flex justify-between items-center"
              onClick={() => setOpen(open === i ? null : i)}
            >
              <span>{item.question}</span>
              <span className="text-gray-400 ml-2">{open === i ? "▲" : "▼"}</span>
            </button>
            {open === i && (
              <div className="px-5 pb-4 text-gray-600 text-base leading-relaxed">
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
