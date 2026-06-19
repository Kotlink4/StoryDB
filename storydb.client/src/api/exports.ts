import { apiBaseUrl, apiFetch, ensureOk } from './apiClient'

export type ProjectDossierExportOptions = {
  includeAttributes: boolean
  includeCatalogs: boolean
  includeRelations: boolean
  includeStructureAssignments: boolean
}

export type ProjectExportJobStatus = 'queued' | 'running' | 'succeeded' | 'invalid' | 'failed'

export type ProjectExportJob = {
  id: string
  projectId: number
  kind: string
  status: ProjectExportJobStatus
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  fileName: string | null
  error: string | null
}

const getDownloadFileName = (contentDisposition: string | null, fallback: string) => {
  if (contentDisposition === null) {
    return fallback
  }

  const encodedMatch = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition)
  if (encodedMatch?.[1] !== undefined) {
    try {
      return decodeURIComponent(encodedMatch[1])
    } catch {
      return fallback
    }
  }

  const plainMatch = /filename="?([^";]+)"?/i.exec(contentDisposition)
  return plainMatch?.[1]?.trim() || fallback
}

export const exportProjectDossiersRequest = async (
  projectId: number,
  objectIds: number[],
  options: ProjectDossierExportOptions,
) => {
  const searchParams = new URLSearchParams()

  objectIds.forEach((objectId) => {
    searchParams.append('objectIds', String(objectId))
  })
  searchParams.set('includeAttributes', String(options.includeAttributes))
  searchParams.set('includeCatalogs', String(options.includeCatalogs))
  searchParams.set('includeRelations', String(options.includeRelations))
  searchParams.set('includeStructureAssignments', String(options.includeStructureAssignments))

  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/exports/dossiers.docx?${searchParams.toString()}`)
  await ensureOk(response, 'Failed to export dossiers.')

  return {
    blob: await response.blob(),
    fileName: getDownloadFileName(response.headers.get('Content-Disposition'), 'storydb-dossiers.docx'),
  }
}

export const enqueueProjectDossierExportJobRequest = async (
  projectId: number,
  objectIds: number[],
  options: ProjectDossierExportOptions,
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/exports/dossiers/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      objectIds,
      includeAttributes: options.includeAttributes,
      includeCatalogs: options.includeCatalogs,
      includeRelations: options.includeRelations,
      includeStructureAssignments: options.includeStructureAssignments,
    }),
  })
  await ensureOk(response, 'Failed to enqueue dossier export.')

  return (await response.json()) as ProjectExportJob
}

export const fetchProjectDossierExportJobRequest = async (projectId: number, jobId: string) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/exports/dossiers/jobs/${jobId}`)
  await ensureOk(response, 'Failed to load export job.')

  return (await response.json()) as ProjectExportJob
}

export const downloadProjectDossierExportJobRequest = async (projectId: number, jobId: string) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/exports/dossiers/jobs/${jobId}/download`)
  await ensureOk(response, 'Failed to download dossier export.')

  return {
    blob: await response.blob(),
    fileName: getDownloadFileName(response.headers.get('Content-Disposition'), 'storydb-dossiers.docx'),
  }
}
