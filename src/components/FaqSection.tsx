"use client"
import { useState } from "react"

export default function FaqSection({ items }: { items: { question: string; answer: string }[] }) {
  const [open, setOpen] = useState<number | null>(null)
  if (!items || items.length === 0) return null
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold mb-4">자주 묻는 질문</h2>
      <div className="divide-y divide-gray-200 border rounded-lg">
        {items.map((item, i) => (
          <div key={i}>
            <button
              className="w-full text-left px-5 py-4 font-medium text-gray-800 hover:bg-gray-50 flex justify-between items-center"
              onClick={() => setOpen(open === i ? null : i)}
            >
              <span>{item.question}</span>
              <span className="text-gray-400 ml-2">{open === i ? "▲" : "▼"}</span>
            </button>
            {open === i && (
              <div className="px-5 pb-4 text-gray-600 text-sm leading-relaxed">
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
