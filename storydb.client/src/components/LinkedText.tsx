import type { ReactNode } from 'react'

export type TextLinkTarget = {
  key: string
  label: string
  onOpen: () => void
}

const isTextBoundaryCharacter = (character: string | undefined) =>
  character === undefined || !/[\p{L}\p{N}_]/u.test(character)

const getUniqueTextLinkTargets = (targets: TextLinkTarget[]) => {
  const uniqueTargets = new Map<string, TextLinkTarget>()

  targets.forEach((target) => {
    const normalizedLabel = target.label.trim()
    if (normalizedLabel.length < 2) {
      return
    }

    const key = normalizedLabel.toLocaleLowerCase()
    if (!uniqueTargets.has(key)) {
      uniqueTargets.set(key, { ...target, label: normalizedLabel })
    }
  })

  return Array.from(uniqueTargets.values()).sort((left, right) => right.label.length - left.label.length)
}

export function LinkedText({
  emptyText,
  targets,
  text,
}: {
  emptyText?: string
  targets: TextLinkTarget[]
  text: string | null | undefined
}) {
  const sourceText = text === null || text === undefined || text.length === 0 ? emptyText ?? '' : text
  const linkTargets = getUniqueTextLinkTargets(targets)

  if (sourceText.length === 0 || linkTargets.length === 0) {
    return <>{sourceText}</>
  }

  const normalizedText = sourceText.toLocaleLowerCase()
  const parts: ReactNode[] = []
  let index = 0

  while (index < sourceText.length) {
    const match = linkTargets.find((target) => {
      const normalizedLabel = target.label.toLocaleLowerCase()

      return (
        normalizedText.startsWith(normalizedLabel, index) &&
        isTextBoundaryCharacter(sourceText[index - 1]) &&
        isTextBoundaryCharacter(sourceText[index + target.label.length])
      )
    })

    if (match === undefined) {
      const lastPart = parts[parts.length - 1]
      if (typeof lastPart === 'string') {
        parts[parts.length - 1] = lastPart + sourceText[index]
      } else {
        parts.push(sourceText[index])
      }
      index += 1
      continue
    }

    const linkedText = sourceText.slice(index, index + match.label.length)
    parts.push(
      <button
        className="sp-text-link"
        key={`${match.key}-${index}`}
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          match.onOpen()
        }}
      >
        {linkedText}
      </button>,
    )
    index += match.label.length
  }

  return <>{parts}</>
}
