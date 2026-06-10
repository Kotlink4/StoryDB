import { Check } from 'lucide-react'

type ReadySolution = {
  key: string
  titleKey: string
  descriptionKey: string
  kindKey: string
}

const readySolutions: ReadySolution[] = [
  {
    key: 'character-basics',
    titleKey: 'presetCharacterBasics',
    descriptionKey: 'presetCharacterBasicsDescription',
    kindKey: 'presetKindAttributes',
  },
  {
    key: 'body-attributes',
    titleKey: 'presetBodyAttributes',
    descriptionKey: 'presetBodyAttributesDescription',
    kindKey: 'presetKindAttributes',
  },
  {
    key: 'world-catalogs',
    titleKey: 'presetWorldCatalogs',
    descriptionKey: 'presetWorldCatalogsDescription',
    kindKey: 'presetKindCatalogs',
  },
  {
    key: 'magic-skills-catalogs',
    titleKey: 'presetMagicSkillsCatalogs',
    descriptionKey: 'presetMagicSkillsCatalogsDescription',
    kindKey: 'presetKindCatalogs',
  },
]

type ReadySolutionsPanelProps = {
  selectedKeys: string[]
  t: Record<string, string>
  onChange: (selectedKeys: string[]) => void
}

export function ReadySolutionsPanel({ selectedKeys, t, onChange }: ReadySolutionsPanelProps) {
  const selectedKeySet = new Set(selectedKeys)

  const toggleSolution = (solutionKey: string) => {
    const nextKeys = new Set(selectedKeySet)
    if (nextKeys.has(solutionKey)) {
      nextKeys.delete(solutionKey)
    } else {
      nextKeys.add(solutionKey)
    }

    onChange(Array.from(nextKeys))
  }

  return (
    <section className="ready-solutions-panel">
      <div className="ready-solutions-intro">
        <p>{t.readySolutionsHint}</p>
      </div>
      <div className="ready-solutions-grid">
        {readySolutions.map((solution) => {
          const isSelected = selectedKeySet.has(solution.key)

          return (
            <button
              className={
                isSelected ? 'ready-solution-card is-selected' : 'ready-solution-card'
              }
              key={solution.key}
              type="button"
              onClick={() => toggleSolution(solution.key)}
            >
              <span className="ready-solution-check" aria-hidden="true">
                {isSelected && <Check size={15} strokeWidth={2.5} />}
              </span>
              <span className="ready-solution-content">
                <small>{t[solution.kindKey]}</small>
                <strong>{t[solution.titleKey]}</strong>
                <span>{t[solution.descriptionKey]}</span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
