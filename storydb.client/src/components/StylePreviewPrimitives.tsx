import { useEffect, useState, type ReactNode } from 'react'
import {
  Activity,
  Atom,
  BookOpen,
  Brain,
  Circle,
  Dumbbell,
  Eye,
  Flame,
  Heart,
  Leaf,
  Shield,
  Sparkles,
  Star,
  Sword,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import { resolveAssetUrl } from '../api'
import { getInitials } from '../style-preview/domain/previewDisplay'
import { attributeIconLabels, type PreviewLanguage, type PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type { StoryObject } from '../types'

export function PreviewDialog({
  children,
  title,
  onClose,
}: {
  children: ReactNode
  title: string
  onClose: () => void
}) {
  return (
    <div className="sp-modal" role="dialog" aria-modal="true">
      <div className="sp-dialog">
        <div className="sp-dialog-head">
          <h2>{title}</h2>
          <button className="sp-icon-button" type="button" onClick={onClose}>
            x
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const attributeIconOptions: Array<{ key: keyof typeof attributeIconLabels.ru; Icon: LucideIcon }> = [
  { key: 'none', Icon: Circle },
  { key: 'star', Icon: Star },
  { key: 'heart', Icon: Heart },
  { key: 'brain', Icon: Brain },
  { key: 'activity', Icon: Activity },
  { key: 'dumbbell', Icon: Dumbbell },
  { key: 'eye', Icon: Eye },
  { key: 'flame', Icon: Flame },
  { key: 'leaf', Icon: Leaf },
  { key: 'sparkles', Icon: Sparkles },
  { key: 'zap', Icon: Zap },
  { key: 'shield', Icon: Shield },
  { key: 'sword', Icon: Sword },
  { key: 'book', Icon: BookOpen },
  { key: 'atom', Icon: Atom },
]

export function ObjectPortrait({ storyObject }: { storyObject: StoryObject }) {
  const imageUrl = resolveAssetUrl(storyObject.imagePath)
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null)
  const shouldShowImage = imageUrl !== null && imageUrl !== failedImageUrl

  useEffect(() => {
    setFailedImageUrl(null)
  }, [imageUrl])

  return (
    <div className="sp-portrait">
      {shouldShowImage ? (
        <img alt="" src={imageUrl} onError={() => setFailedImageUrl(imageUrl)} />
      ) : (
        getInitials(storyObject.name)
      )}
    </div>
  )
}

export type SectionIconName =
  | 'characters'
  | 'items'
  | 'places'
  | 'organizations'
  | 'attributes'
  | 'catalogs'
  | 'structures'

export function SectionIcon({ name }: { name: SectionIconName }) {
  const commonProps = {
    'aria-hidden': true,
    className: 'sp-nav-icon',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 2,
    viewBox: '0 0 24 24',
  }

  if (name === 'characters') {
    return (
      <svg {...commonProps}>
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    )
  }

  if (name === 'items') {
    return (
      <svg {...commonProps}>
        <path d="M6 7h12l-1 13H7L6 7Z" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </svg>
    )
  }

  if (name === 'places') {
    return (
      <svg {...commonProps}>
        <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" />
        <path d="M12 10.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      </svg>
    )
  }

  if (name === 'organizations') {
    return (
      <svg {...commonProps}>
        <path d="M4 21V8l8-4 8 4v13" />
        <path d="M9 21v-7h6v7" />
        <path d="M8 10h.01M12 10h.01M16 10h.01" />
      </svg>
    )
  }

  if (name === 'attributes') {
    return (
      <svg {...commonProps}>
        <path d="M4 7h16" />
        <path d="M7 12h10" />
        <path d="M10 17h4" />
      </svg>
    )
  }

  if (name === 'structures') {
    return (
      <svg {...commonProps}>
        <path d="M12 4v4" />
        <path d="M6 12h12" />
        <path d="M6 12v4" />
        <path d="M18 12v4" />
        <rect height="4" rx="1" width="8" x="8" y="2" />
        <rect height="4" rx="1" width="8" x="2" y="16" />
        <rect height="4" rx="1" width="8" x="14" y="16" />
      </svg>
    )
  }

  return (
    <svg {...commonProps}>
      <path d="M4 5h16v14H4z" />
      <path d="M4 10h16" />
      <path d="M9 5v14" />
    </svg>
  )
}

export function KebabMenu({
  ui,
  onDelete,
  onEdit,
}: {
  ui: PreviewText
  onDelete?: () => void
  onEdit?: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const closeMenu = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest('.sp-inline-menu') === null) {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', closeMenu)
    return () => document.removeEventListener('pointerdown', closeMenu)
  }, [isOpen])

  if (onDelete === undefined && onEdit === undefined) {
    return null
  }

  return (
    <div className="sp-inline-menu">
      <button aria-label={ui.actions} type="button" onClick={() => setIsOpen((value) => !value)}>
        ⋮
      </button>
      {isOpen && (
        <div className="sp-card-dropdown">
          {onEdit !== undefined && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                onEdit()
              }}
            >
              {ui.edit}
            </button>
          )}
          {onDelete !== undefined && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                onDelete()
              }}
            >
              {ui.delete}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function DetailActionsMenu({
  ui,
  onDelete,
  onEdit,
}: {
  ui: PreviewText
  onDelete?: () => void
  onEdit?: () => void
}) {
  if (onDelete === undefined && onEdit === undefined) {
    return null
  }

  return (
    <div className="sp-detail-menu">
      <KebabMenu ui={ui} onDelete={onDelete} onEdit={onEdit} />
    </div>
  )
}

export function AttributeIcon({ iconKey }: { iconKey: string | null | undefined }) {
  const option = attributeIconOptions.find((item) => item.key === iconKey)
  if (option === undefined || option.key === 'none') {
    return null
  }

  const Icon = option.Icon
  return (
    <span className="sp-attribute-icon" aria-hidden="true">
      <Icon size={16} strokeWidth={2.4} />
    </span>
  )
}

export function AttributeIconPicker({
  language,
  value,
  onChange,
}: {
  language: PreviewLanguage
  value: string | null | undefined
  onChange: (iconKey: string) => void
}) {
  const normalizedValue = value === null || value === undefined || value.length === 0 ? 'none' : value

  return (
    <div className="sp-icon-picker">
      {attributeIconOptions.map(({ key, Icon }) => {
        const label = attributeIconLabels[language][key]
        return (
          <button
            aria-label={label}
            className={normalizedValue === key ? 'active' : ''}
            key={key}
            title={label}
            type="button"
            onClick={() => onChange(key === 'none' ? '' : key)}
          >
            <Icon size={18} strokeWidth={2.4} />
          </button>
        )
      })}
    </div>
  )
}
