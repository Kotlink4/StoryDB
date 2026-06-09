import type { ObjectTypeKey } from '../types'

const requiredModuleKeys: ObjectTypeKey[] = ['characters']
const optionalModuleKeys: ObjectTypeKey[] = ['items', 'places', 'organizations', 'hierarchy']

type DatabaseModulesPanelProps = {
  enabledKeys: ObjectTypeKey[]
  t: Record<string, string>
  onChange: (enabledKeys: ObjectTypeKey[]) => void
}

export function DatabaseModulesPanel({ enabledKeys, t, onChange }: DatabaseModulesPanelProps) {
  const normalizedEnabledKeys = new Set<ObjectTypeKey>([...enabledKeys, ...requiredModuleKeys])

  const toggleModule = (moduleKey: ObjectTypeKey) => {
    if (requiredModuleKeys.includes(moduleKey)) {
      return
    }

    const nextEnabledKeys = new Set(normalizedEnabledKeys)
    if (nextEnabledKeys.has(moduleKey)) {
      nextEnabledKeys.delete(moduleKey)
    } else {
      nextEnabledKeys.add(moduleKey)
    }

    requiredModuleKeys.forEach((requiredKey) => nextEnabledKeys.add(requiredKey))
    onChange(Array.from(nextEnabledKeys))
  }

  return (
    <section className="modules-panel">
      <ul className="module-tree" aria-label={t.databaseModules}>
        <li className="module-tree-item">
          <label className="module-option is-locked">
            <input type="checkbox" checked disabled />
            <span>{t.characters}</span>
          </label>
          <ul className="module-tree-children">
            <li>
              <label className="module-option is-locked">
                <input type="checkbox" checked disabled />
                <span>{t.attributes}</span>
              </label>
            </li>
          </ul>
        </li>

        {optionalModuleKeys.map((moduleKey) => (
          <li className="module-tree-item" key={moduleKey}>
            <label className="module-option">
              <input
                type="checkbox"
                checked={normalizedEnabledKeys.has(moduleKey)}
                onChange={() => toggleModule(moduleKey)}
              />
              <span>{t[moduleKey]}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  )
}
