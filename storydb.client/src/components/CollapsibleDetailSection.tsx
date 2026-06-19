import type { ReactNode } from 'react'

export function CollapsibleDetailSection({
  children,
  count,
  title,
}: {
  children: ReactNode
  count: number
  title: string
}) {
  return (
    <details className="sp-panel sp-collapsible-section" open>
      <summary>
        <span>{title}</span>
        <strong>{count}</strong>
      </summary>
      {children}
    </details>
  )
}
