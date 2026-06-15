import { useMemo, useState } from 'react'

import {
  downloadProjectDossierExportJobRequest,
  enqueueProjectDossierExportJobRequest,
  fetchProjectDossierExportJobRequest,
  getApiErrorMessage,
  type ProjectDossierExportOptions,
  type ProjectExportJob,
} from '../api'
import { getObjectFullName } from '../style-preview/domain/objectDisplay'
import { objectSections } from '../style-preview/domain/stylePreviewConfig'
import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type { ObjectTypeKey, StoryObject } from '../types'
import { SectionIcon } from './StylePreviewPrimitives'

const defaultExportOptions: ProjectDossierExportOptions = {
  includeAttributes: true,
  includeCatalogs: true,
  includeRelations: true,
  includeStructureAssignments: true,
}

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const delay = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds))

const waitForExportJob = async (projectId: number, jobId: string): Promise<ProjectExportJob> => {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const job = await fetchProjectDossierExportJobRequest(projectId, jobId)
    if (job.status === 'succeeded' || job.status === 'failed' || job.status === 'invalid') {
      return job
    }

    await delay(attempt < 10 ? 500 : 1000)
  }

  throw new Error('Export job did not finish in time.')
}

export function ProjectExportWorkspace({
  enabledObjectTypes,
  errorMessage,
  objectsByType,
  selectedProjectId,
  ui,
  onBackToProject,
  onError,
  onMessage,
}: {
  enabledObjectTypes: ObjectTypeKey[]
  errorMessage: string
  objectsByType: Partial<Record<ObjectTypeKey, StoryObject[]>>
  selectedProjectId: number
  ui: PreviewText
  onBackToProject: () => void
  onError: (message: string) => void
  onMessage: (message: string) => void
}) {
  const [enabledTypes, setEnabledTypes] = useState<Set<ObjectTypeKey>>(() => new Set(enabledObjectTypes))
  const [selectedObjectIds, setSelectedObjectIds] = useState<Set<number>>(() => new Set())
  const [options, setOptions] = useState<ProjectDossierExportOptions>(defaultExportOptions)
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState('')

  const availableSections = useMemo(
    () =>
      objectSections.filter(
        (section) => enabledObjectTypes.includes(section.key) && (objectsByType[section.key]?.length ?? 0) > 0,
      ),
    [enabledObjectTypes, objectsByType],
  )
  const visibleObjects = useMemo(
    () =>
      availableSections.flatMap((section) =>
        enabledTypes.has(section.key) ? objectsByType[section.key] ?? [] : [],
      ),
    [availableSections, enabledTypes, objectsByType],
  )
  const selectedCount = selectedObjectIds.size

  const toggleType = (typeKey: ObjectTypeKey) => {
    setEnabledTypes((currentTypes) => {
      const nextTypes = new Set(currentTypes)

      if (nextTypes.has(typeKey)) {
        nextTypes.delete(typeKey)
      } else {
        nextTypes.add(typeKey)
      }

      return nextTypes
    })
  }

  const toggleObject = (objectId: number) => {
    setSelectedObjectIds((currentIds) => {
      const nextIds = new Set(currentIds)

      if (nextIds.has(objectId)) {
        nextIds.delete(objectId)
      } else {
        nextIds.add(objectId)
      }

      return nextIds
    })
  }

  const selectVisibleObjects = () => {
    setSelectedObjectIds((currentIds) => {
      const nextIds = new Set(currentIds)

      visibleObjects.forEach((storyObject) => nextIds.add(storyObject.id))

      return nextIds
    })
  }

  const selectCategoryObjects = (typeKey: ObjectTypeKey) => {
    setSelectedObjectIds((currentIds) => {
      const nextIds = new Set(currentIds)

      const categoryObjects = objectsByType[typeKey] ?? []
      categoryObjects.forEach((storyObject) => nextIds.add(storyObject.id))

      return nextIds
    })
  }

  const exportDossiers = async () => {
    if (selectedObjectIds.size === 0) {
      onError(ui.exportNoObjectsSelected)
      return
    }

    try {
      setIsExporting(true)
      setExportStatus(ui.exportQueued)

      const job = await enqueueProjectDossierExportJobRequest(selectedProjectId, Array.from(selectedObjectIds), options)
      setExportStatus(job.status === 'queued' ? ui.exportQueued : ui.exportRunning)

      const completedJob = await waitForExportJob(selectedProjectId, job.id)
      if (completedJob.status !== 'succeeded') {
        throw new Error(completedJob.error?.trim() || ui.exportFailed)
      }

      setExportStatus(ui.exportDownloading)
      const result = await downloadProjectDossierExportJobRequest(selectedProjectId, completedJob.id)

      downloadBlob(result.blob, result.fileName)
      setExportStatus(ui.exportReady)
      onMessage(ui.exportReady)
    } catch (error) {
      setExportStatus(ui.exportFailed)
      onError(error instanceof Error ? error.message : getApiErrorMessage(error, errorMessage))
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <section className="sp-database-main sp-export-workspace">
      <div className="sp-workspace-head">
        <div>
          <h2>{ui.exportDossiers}</h2>
          <p>{ui.exportDossiersDescription}</p>
        </div>
        <div className="sp-detail-actions">
          <button className="sp-button" type="button" onClick={onBackToProject}>
            {ui.database}
          </button>
          <button className="sp-button" type="button" onClick={() => setSelectedObjectIds(new Set())}>
            {ui.clearSelection}
          </button>
          <button className="sp-button primary" disabled={isExporting || selectedCount === 0} type="button" onClick={() => void exportDossiers()}>
            {isExporting ? ui.exportPreparing : ui.downloadWord}
          </button>
        </div>
      </div>
      {exportStatus.trim().length > 0 && (
        <div className="sp-export-status" role="status">
          {exportStatus}
        </div>
      )}

      <div className="sp-export-grid">
        <aside className="sp-panel sp-export-settings">
          <h3>{ui.exportSettings}</h3>
          <p>{ui.exportSettingsHint}</p>
          <div className="sp-export-option-list">
            <label>
              <input
                checked={options.includeAttributes}
                type="checkbox"
                onChange={(event) => setOptions((currentOptions) => ({
                  ...currentOptions,
                  includeAttributes: event.target.checked,
                }))}
              />
              {ui.attributes}
            </label>
            <label>
              <input
                checked={options.includeCatalogs}
                type="checkbox"
                onChange={(event) => setOptions((currentOptions) => ({
                  ...currentOptions,
                  includeCatalogs: event.target.checked,
                }))}
              />
              {ui.catalogs}
            </label>
            <label>
              <input
                checked={options.includeRelations}
                type="checkbox"
                onChange={(event) => setOptions((currentOptions) => ({
                  ...currentOptions,
                  includeRelations: event.target.checked,
                }))}
              />
              {ui.relations}
            </label>
            <label>
              <input
                checked={options.includeStructureAssignments}
                type="checkbox"
                onChange={(event) => setOptions((currentOptions) => ({
                  ...currentOptions,
                  includeStructureAssignments: event.target.checked,
                }))}
              />
              {ui.structureMembership}
            </label>
          </div>
        </aside>

        <div className="sp-panel sp-export-picker">
          <div className="sp-export-picker-head">
            <div>
              <h3>{ui.exportObjects}</h3>
              <p>{selectedCount} {ui.selectedObjects}</p>
            </div>
            <button className="sp-button" type="button" onClick={selectVisibleObjects}>
              {ui.selectVisibleObjects}
            </button>
          </div>

          <div className="sp-export-type-filters">
            {availableSections.map((section) => (
              <button
                className={enabledTypes.has(section.key) ? 'active' : ''}
                key={section.key}
                type="button"
                onClick={() => toggleType(section.key)}
              >
                <SectionIcon name={section.icon} />
                {ui[section.labelKey]}
                <span>{objectsByType[section.key]?.length ?? 0}</span>
              </button>
            ))}
          </div>

          {availableSections.length === 0 ? (
            <div className="sp-empty compact">
              <strong>{ui.noObjects}</strong>
              <span>{ui.exportNoObjectsHint}</span>
            </div>
          ) : (
            <div className="sp-export-object-groups">
              {availableSections.map((section) => {
                if (!enabledTypes.has(section.key)) {
                  return null
                }

                return (
                  <section className="sp-export-object-group" key={section.key}>
                    <div className="sp-export-object-group-head">
                      <h3>{ui[section.labelKey]}</h3>
                      <button className="sp-button" type="button" onClick={() => selectCategoryObjects(section.key)}>
                        {ui.selectCategoryObjects}
                      </button>
                    </div>
                    <div className="sp-export-object-list">
                      {(objectsByType[section.key] ?? []).map((storyObject) => (
                        <label className="sp-export-object-row" key={storyObject.id}>
                          <input
                            checked={selectedObjectIds.has(storyObject.id)}
                            type="checkbox"
                            onChange={() => toggleObject(storyObject.id)}
                          />
                          <span>
                            <strong>{getObjectFullName(storyObject)}</strong>
                            <small>{storyObject.currentStatus?.trim() || storyObject.role?.trim() || ui.noDescription}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
