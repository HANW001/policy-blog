import Link from "next/link"

export interface BreadcrumbItem {
  name: string
  href: string
}

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="text-sm text-gray-500 mb-6" aria-label="breadcrumb">
      {items.map((item, i) => (
        <span key={item.href}>
          {i > 0 && <span className="mx-2">/</span>}
          {i === items.length - 1 ? (
            <span className="text-gray-800">{item.name}</span>
          ) : (
            <Link href={item.href} className="hover:text-blue-700">{item.name}</Link>
          )}
        </span>
      ))}
    </nav>
  )
}
