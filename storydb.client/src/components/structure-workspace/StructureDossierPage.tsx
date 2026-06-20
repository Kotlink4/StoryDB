import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'

export function StructureDossierPage({
  children,
  description,
  title,
  ui,
  onBack,
}: {
  children: ReactNode
  description?: string
  title: string
  ui: PreviewText
  onBack: () => void
}) {
  return (
    <div className="sp-object-page">
      <div className="sp-content-head">
        <div>
          <h2>{title}</h2>
          {description !== undefined && description.trim().length > 0 && <p>{description}</p>}
        </div>
        <button
          className="sp-icon-button sp-page-back-button"
          type="button"
          aria-label={ui.back}
          title={ui.back}
          onClick={onBack}
        >
          <ArrowLeft aria-hidden="true" size={18} />
        </button>
      </div>
      {children}
    </div>
  )
}
