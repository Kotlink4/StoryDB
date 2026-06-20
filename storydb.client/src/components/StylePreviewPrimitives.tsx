import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import {
  Activity,
  Anchor,
  Atom,
  Award,
  Axe,
  Backpack,
  Badge,
  Banknote,
  Beaker,
  BicepsFlexed,
  Binoculars,
  Bolt,
  Bone,
  BookOpen,
  BowArrow,
  Brain,
  Castle,
  ChartLine,
  ChessKnight,
  Circle,
  Coins,
  Compass,
  Crown,
  Dna,
  Dumbbell,
  Eye,
  Feather,
  Flame,
  Gem,
  Hand,
  Handshake,
  Heart,
  Key,
  Leaf,
  Map,
  Medal,
  Mountain,
  Scale,
  Scroll,
  Shield,
  Skull,
  Sparkles,
  Star,
  Sun,
  Sword,
  Target,
  Telescope,
  Trophy,
  User,
  Users,
  WandSparkles,
  Waves,
  Wind,
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
  { key: 'biceps', Icon: BicepsFlexed },
  { key: 'eye', Icon: Eye },
  { key: 'flame', Icon: Flame },
  { key: 'leaf', Icon: Leaf },
  { key: 'sparkles', Icon: Sparkles },
  { key: 'wand', Icon: WandSparkles },
  { key: 'zap', Icon: Zap },
  { key: 'bolt', Icon: Bolt },
  { key: 'sun', Icon: Sun },
  { key: 'waves', Icon: Waves },
  { key: 'wind', Icon: Wind },
  { key: 'shield', Icon: Shield },
  { key: 'skull', Icon: Skull },
  { key: 'sword', Icon: Sword },
  { key: 'axe', Icon: Axe },
  { key: 'bow', Icon: BowArrow },
  { key: 'target', Icon: Target },
  { key: 'book', Icon: BookOpen },
  { key: 'scroll', Icon: Scroll },
  { key: 'atom', Icon: Atom },
  { key: 'beaker', Icon: Beaker },
  { key: 'dna', Icon: Dna },
  { key: 'telescope', Icon: Telescope },
  { key: 'chart', Icon: ChartLine },
  { key: 'crown', Icon: Crown },
  { key: 'castle', Icon: Castle },
  { key: 'chess', Icon: ChessKnight },
  { key: 'scale', Icon: Scale },
  { key: 'handshake', Icon: Handshake },
  { key: 'users', Icon: Users },
  { key: 'user', Icon: User },
  { key: 'badge', Icon: Badge },
  { key: 'award', Icon: Award },
  { key: 'medal', Icon: Medal },
  { key: 'trophy', Icon: Trophy },
  { key: 'gem', Icon: Gem },
  { key: 'coins', Icon: Coins },
  { key: 'banknote', Icon: Banknote },
  { key: 'key', Icon: Key },
  { key: 'backpack', Icon: Backpack },
  { key: 'hand', Icon: Hand },
  { key: 'feather', Icon: Feather },
  { key: 'bone', Icon: Bone },
  { key: 'map', Icon: Map },
  { key: 'compass', Icon: Compass },
  { key: 'mountain', Icon: Mountain },
  { key: 'anchor', Icon: Anchor },
  { key: 'binoculars', Icon: Binoculars },
]

export function ObjectPortrait({ storyObject }: { storyObject: StoryObject }) {
  const imageUrl = resolveAssetUrl(storyObject.imagePath)
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null)
  const shouldShowImage = imageUrl !== null && imageUrl !== failedImageUrl

  useEffect(() => {
    setFailedImageUrl(null)
  }, [imageUrl])

  return (
    <div className={`sp-portrait type-${storyObject.typeKey}`}>
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
  | 'exports'

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

  if (name === 'exports') {
    return (
      <svg {...commonProps}>
        <path d="M12 3v10" />
        <path d="m8 9 4 4 4-4" />
        <path d="M5 15v4h14v-4" />
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
  ariaLabel,
  className = '',
  ui,
  onDelete,
  onEdit,
  onExport,
}: {
  ariaLabel?: string
  className?: string
  ui: PreviewText
  onDelete?: () => void
  onEdit?: () => void
  onExport?: () => void
}) {
  const menuId = useId()
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

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const closeOtherMenu = (event: Event) => {
      const openedMenuId = event instanceof CustomEvent ? event.detail?.menuId : null
      if (openedMenuId !== menuId) {
        setIsOpen(false)
      }
    }

    document.addEventListener('storydb:kebab-menu-open', closeOtherMenu)
    return () => document.removeEventListener('storydb:kebab-menu-open', closeOtherMenu)
  }, [isOpen, menuId])

  if (onDelete === undefined && onEdit === undefined && onExport === undefined) {
    return null
  }

  return (
    <div className={`sp-inline-menu ${className}`.trim()}>
      <button
        aria-label={ariaLabel ?? ui.actions}
        type="button"
        onClick={() => {
          setIsOpen((value) => {
            const nextValue = !value
            if (nextValue) {
              document.dispatchEvent(new CustomEvent('storydb:kebab-menu-open', { detail: { menuId } }))
            }

            return nextValue
          })
        }}
      >
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
          {onExport !== undefined && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                onExport()
              }}
            >
              {ui.export}
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
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const selectedOption =
    attributeIconOptions.find((item) => item.key === normalizedValue) ?? attributeIconOptions[0]
  const SelectedIcon = selectedOption.Icon
  const selectedLabel = attributeIconLabels[language][selectedOption.key]
  const searchPlaceholder = language === 'ru' ? 'Найти иконку...' : 'Find icon...'
  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase()
    if (query.length === 0) {
      return attributeIconOptions
    }

    return attributeIconOptions.filter(({ key }) => {
      const label = attributeIconLabels[language][key].toLocaleLowerCase()
      return label.includes(query) || key.includes(query)
    })
  }, [language, searchQuery])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const closePicker = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest('.sp-icon-picker') === null) {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', closePicker)
    return () => document.removeEventListener('pointerdown', closePicker)
  }, [isOpen])

  return (
    <div className="sp-icon-picker">
      <button
        aria-expanded={isOpen}
        className="sp-icon-picker-trigger"
        title={selectedLabel}
        type="button"
        onClick={() => setIsOpen((value) => !value)}
      >
        <SelectedIcon size={18} strokeWidth={2.4} />
        <span>{selectedLabel}</span>
      </button>
      {isOpen && (
        <div className="sp-icon-picker-popover">
          <input
            autoFocus
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <div className="sp-icon-picker-grid">
            {filteredOptions.map(({ key, Icon }) => {
              const label = attributeIconLabels[language][key]

              return (
                <button
                  aria-label={label}
                  className={normalizedValue === key ? 'active' : ''}
                  key={key}
                  title={label}
                  type="button"
                  onClick={() => {
                    onChange(key === 'none' ? '' : key)
                    setIsOpen(false)
                    setSearchQuery('')
                  }}
                >
                  <Icon size={22} strokeWidth={2.4} />
                  <span>{label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
