const baseUrl = (process.env.STORYDB_BASE_URL || 'http://localhost:50201').replace(/\/$/, '')
let email = process.env.STORYDB_EMAIL || ''
let password = process.env.STORYDB_PASSWORD || ''
let projectId = Number(process.env.STORYDB_PROJECT_ID || 0)
const totalRequests = Number(process.env.STORYDB_SMOKE_TOTAL || 150)
const concurrency = Number(process.env.STORYDB_SMOKE_CONCURRENCY || 15)
const readPasses = Math.max(1, Number(process.env.STORYDB_SMOKE_READ_PASSES || 1))
const timeoutMs = Number(process.env.STORYDB_SMOKE_TIMEOUT_MS || 10000)
const maxFailureRate = Number(process.env.STORYDB_SMOKE_MAX_FAILURE_RATE || 0)
const maxP95Ms = Number(process.env.STORYDB_SMOKE_MAX_P95_MS || 1500)
const shouldCreateProject = process.env.STORYDB_SMOKE_CREATE_PROJECT === '1'
const shouldCleanupProject = process.env.STORYDB_SMOKE_CLEANUP_PROJECT !== '0'
const seedObjectCount = Number(process.env.STORYDB_SMOKE_SEED_OBJECTS || 0)
const seedEventCount = Number(process.env.STORYDB_SMOKE_SEED_EVENTS || 0)
const seedStructureCount = Number(process.env.STORYDB_SMOKE_SEED_STRUCTURES || 0)
const smokeUserEmail = process.env.STORYDB_SMOKE_EMAIL || 'storydb-smoke@example.test'
const smokeUserPassword = process.env.STORYDB_SMOKE_PASSWORD || 'StoryDB-Smoke-Password-42'

const cookieJar = new Map()

function recordCookies(response) {
  const setCookie = response.headers.get('set-cookie')
  if (!setCookie) {
    return
  }

  for (const rawCookie of setCookie.split(/,(?=[^;,]+=)/)) {
    const [pair] = rawCookie.split(';')
    const separatorIndex = pair.indexOf('=')
    if (separatorIndex <= 0) {
      continue
    }

    cookieJar.set(pair.slice(0, separatorIndex).trim(), pair.slice(separatorIndex + 1).trim())
  }
}

function getCookieHeader() {
  return [...cookieJar.entries()].map(([name, value]) => `${name}=${value}`).join('; ')
}

async function request(method, path, body = undefined) {
  const startedAt = performance.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const headers = {}
  const cookieHeader = getCookieHeader()

  if (cookieHeader) {
    headers.Cookie = cookieHeader
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
    const text = await response.text()
    recordCookies(response)
    return {
      ok: response.ok,
      status: response.status,
      method,
      path,
      ms: performance.now() - startedAt,
      bytes: text.length,
      text,
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      method,
      path,
      ms: performance.now() - startedAt,
      bytes: 0,
      text: '',
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function loginIfConfigured() {
  if (!email || !password) {
    return false
  }

  const result = await request('POST', '/api/auth/login', { email, password })
  if (!result.ok) {
    console.error(`Login failed: HTTP ${result.status} in ${Math.round(result.ms)} ms`)
    process.exitCode = 1
    return false
  }

  return true
}

async function ensureSmokeIdentity() {
  email = smokeUserEmail
  password = smokeUserPassword

  const registerResult = await request('POST', '/api/auth/register', {
    email,
    password,
    displayName: 'StoryDB smoke test',
  })
  if (registerResult.ok) {
    return true
  }

  if (registerResult.status !== 409) {
    console.error(`Smoke user registration failed: HTTP ${registerResult.status} in ${Math.round(registerResult.ms)} ms`)
    process.exitCode = 1
    return false
  }

  const loginResult = await request('POST', '/api/auth/login', { email, password })
  if (!loginResult.ok) {
    console.error(`Smoke user login failed: HTTP ${loginResult.status} in ${Math.round(loginResult.ms)} ms`)
    process.exitCode = 1
    return false
  }

  return true
}

async function createSmokeProjectIfRequested() {
  if (!shouldCreateProject || (email && password && projectId > 0)) {
    return false
  }

  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  if (!await ensureSmokeIdentity()) {
    return false
  }

  const projectResult = await request('POST', '/api/projects', {
    name: `Smoke project ${stamp}`,
    coverImagePath: null,
    enabledObjectTypeKeys: null,
    presetKeys: null,
    templatePackIds: null,
    visibility: 'private',
  })
  if (!projectResult.ok) {
    console.error(`Smoke project creation failed: HTTP ${projectResult.status} in ${Math.round(projectResult.ms)} ms`)
    process.exitCode = 1
    return false
  }

  try {
    const project = JSON.parse(projectResult.text)
    projectId = Number(project.id || 0)
  } catch {
    projectId = 0
  }

  if (projectId <= 0) {
    console.error('Smoke project creation did not return a project id.')
    process.exitCode = 1
    return false
  }

  await seedProjectIfRequested(stamp)

  return true
}

async function seedProjectIfRequested(stamp) {
  const objectIds = []
  const objectTypes = ['characters', 'items', 'places', 'organizations']

  for (let index = 0; index < seedObjectCount; index += 1) {
    const typeKey = objectTypes[index % objectTypes.length]
    const objectId = await createSmokeObject(typeKey, `Smoke ${typeKey} ${index + 1}`, stamp)
    if (objectId === null) {
      return
    }

    objectIds.push(objectId)
  }

  await seedStructuresIfRequested(stamp, objectIds)

  const participantObjectIds = objectIds.filter((id) => id > 0).slice(0, 3)
  for (let index = 0; index < seedEventCount; index += 1) {
    const eventResult = await request('POST', `/api/projects/${projectId}/timeline/events`, {
      title: `Smoke event ${index + 1}`,
      eventType: index % 3 === 0 ? 'duration' : 'point',
      parentEventId: null,
      description: `Generated by smoke-load.mjs for timeline read-path load verification.`,
      startLabel: String(index),
      endLabel: index % 3 === 0 ? String(index + 1) : null,
      startValue: index,
      endValue: index % 3 === 0 ? index + 1 : null,
      category: index % 2 === 0 ? 'smoke-alpha' : 'smoke-beta',
      color: index % 2 === 0 ? '#2563eb' : '#16a34a',
      imagePath: null,
      participants: participantObjectIds.map((id) => ({
        targetType: 'storyObject',
        targetId: id,
        role: 'Participant',
      })),
      changes: [],
    })

    if (!eventResult.ok) {
      console.error(`Smoke timeline event seed failed: HTTP ${eventResult.status} in ${Math.round(eventResult.ms)} ms`)
      process.exitCode = 1
      return
    }
  }
}

async function createSmokeObject(typeKey, name, stamp) {
  const objectResult = await request('POST', `/api/projects/${projectId}/objects`, {
    typeKey,
    name,
    surname: typeKey === 'characters' ? `Load-${stamp}` : null,
    surnameForm: null,
    description: `Generated by smoke-load.mjs for read-path load verification.`,
    age: null,
    role: typeKey === 'characters' ? 'Smoke actor' : null,
    currentStatus: 'Active',
    imagePath: null,
    attributes: [],
    hierarchySelections: [],
    catalogSelections: [],
    ownedItemIds: [],
    ownerCharacterIds: [],
    territoryPlaceIds: [],
    ownerOrganizationIds: [],
    parentObjectIds: [],
    characterRelationships: [],
  })

  if (!objectResult.ok) {
    console.error(`Smoke object seed failed: HTTP ${objectResult.status} in ${Math.round(objectResult.ms)} ms`)
    process.exitCode = 1
    return null
  }

  try {
    const storyObject = JSON.parse(objectResult.text)
    return Number(storyObject.id || 0)
  } catch {
    return 0
  }
}

async function seedStructuresIfRequested(stamp, objectIds) {
  if (seedStructureCount <= 0) {
    return
  }

  const fallbackTypes = ['organizations', 'characters', 'characters']
  while (objectIds.filter((id) => id > 0).length < 3) {
    const fallbackIndex = objectIds.length
    const typeKey = fallbackTypes[fallbackIndex % fallbackTypes.length]
    const objectId = await createSmokeObject(typeKey, `Smoke structure ${typeKey} ${fallbackIndex + 1}`, stamp)
    if (objectId === null) {
      return
    }

    objectIds.push(objectId)
  }

  const assignableObjectIds = objectIds.filter((id) => id > 0)
  for (let index = 0; index < seedStructureCount; index += 1) {
    const structureResult = await request('POST', `/api/projects/${projectId}/structures`, {
      name: `Smoke hierarchy ${index + 1}`,
      description: `Generated by smoke-load.mjs for structure read-path load verification.`,
      ownerKind: 'project',
      ownerId: projectId,
      layoutKind: 'tree',
      nodeBindingMode: 'none',
      linkedCatalogId: null,
      nodes: [
        {
          clientId: `root-${index}`,
          parentClientId: null,
          linkedCatalogEntryId: null,
          linkedCatalogEntryGroupId: null,
          name: `Smoke root ${index + 1}`,
          description: null,
          nodeType: 'root',
          color: '#2563eb',
          iconKey: 'network',
          levelIndex: 0,
          sortOrder: 0,
        },
        {
          clientId: `branch-a-${index}`,
          parentClientId: `root-${index}`,
          linkedCatalogEntryId: null,
          linkedCatalogEntryGroupId: null,
          name: `Smoke branch A ${index + 1}`,
          description: null,
          nodeType: 'branch',
          color: '#16a34a',
          iconKey: 'git-branch',
          levelIndex: 1,
          sortOrder: 10,
        },
        {
          clientId: `branch-b-${index}`,
          parentClientId: `root-${index}`,
          linkedCatalogEntryId: null,
          linkedCatalogEntryGroupId: null,
          name: `Smoke branch B ${index + 1}`,
          description: null,
          nodeType: 'branch',
          color: '#a855f7',
          iconKey: 'git-branch',
          levelIndex: 1,
          sortOrder: 20,
        },
      ],
      edges: [
        {
          sourceClientId: `root-${index}`,
          targetClientId: `branch-a-${index}`,
          relationType: 'contains',
          description: null,
          sortOrder: 10,
        },
        {
          sourceClientId: `root-${index}`,
          targetClientId: `branch-b-${index}`,
          relationType: 'contains',
          description: null,
          sortOrder: 20,
        },
      ],
    })

    if (!structureResult.ok) {
      console.error(`Smoke structure seed failed: HTTP ${structureResult.status} in ${Math.round(structureResult.ms)} ms`)
      process.exitCode = 1
      return
    }

    let structure
    try {
      structure = JSON.parse(structureResult.text)
    } catch {
      console.error('Smoke structure seed did not return a parseable structure.')
      process.exitCode = 1
      return
    }

    const usageResult = await request('POST', `/api/projects/${projectId}/structures/${structure.id}/usages`, {
      targetKind: 'project',
      targetId: projectId,
      displayName: `Smoke hierarchy usage ${index + 1}`,
      notes: null,
      isPrimary: index === 0,
    })

    if (!usageResult.ok) {
      console.error(`Smoke structure usage seed failed: HTTP ${usageResult.status} in ${Math.round(usageResult.ms)} ms`)
      process.exitCode = 1
      return
    }

    let usage
    try {
      usage = JSON.parse(usageResult.text)
    } catch {
      console.error('Smoke structure usage seed did not return a parseable usage.')
      process.exitCode = 1
      return
    }

    for (const [nodeIndex, node] of structure.nodes.slice(0, 3).entries()) {
      const assignmentResult = await request('POST', `/api/projects/${projectId}/structures/usages/${usage.id}/assignments`, {
        structureNodeId: node.id,
        storyObjectId: assignableObjectIds[nodeIndex % assignableObjectIds.length],
        roleLabel: nodeIndex === 0 ? 'Anchor' : 'Member',
        notes: null,
        sortOrder: nodeIndex,
      })

      if (!assignmentResult.ok) {
        console.error(`Smoke structure assignment seed failed: HTTP ${assignmentResult.status} in ${Math.round(assignmentResult.ms)} ms`)
        process.exitCode = 1
        return
      }
    }
  }
}

function buildScenario(isAuthenticated) {
  const scenario = [
    ['GET', '/health'],
    ['GET', '/metrics'],
    ['GET', '/metrics/prometheus'],
  ]

  if (isAuthenticated) {
    scenario.push(['GET', '/api/auth/me'], ['GET', '/api/projects'])
  }

  if (isAuthenticated && projectId > 0) {
    scenario.push(
      ['GET', `/api/projects/${projectId}/objects/summaries`],
      ['GET', `/api/projects/${projectId}/catalogs`],
      ['GET', `/api/projects/${projectId}/attribute-definitions?typeKey=characters`],
      ['GET', `/api/projects/${projectId}/structures`],
      ['GET', `/api/projects/${projectId}/structures/usages`],
      ['GET', `/api/projects/${projectId}/structures/assignments`],
      ['GET', `/api/projects/${projectId}/relations/graph`],
      ['GET', `/api/projects/${projectId}/relations/layout`],
      ['GET', `/api/projects/${projectId}/timeline/events`],
      ['GET', `/api/projects/${projectId}/timeline/links`],
      ['GET', `/api/projects/${projectId}/timeline/layout`],
    )
  }

  return scenario
}

function percentile(values, percentage) {
  if (values.length === 0) {
    return 0
  }

  const index = Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * percentage) - 1))
  return values[index]
}

async function main() {
  const createdProject = await createSmokeProjectIfRequested()
  const authenticated = await loginIfConfigured()
  const scenario = buildScenario(authenticated)
  const results = []

  async function runReadPass(pass) {
    let nextIndex = 0
    const passResults = []

    async function worker() {
      while (nextIndex < totalRequests) {
        const requestIndex = nextIndex
        nextIndex += 1
        const [method, path] = scenario[requestIndex % scenario.length]
        const result = await request(method, path)
        result.pass = pass
        passResults.push(result)
      }
    }

    await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker))
    results.push(...passResults)
  }

  for (let pass = 1; pass <= readPasses; pass += 1) {
    await runReadPass(pass)
  }

  const ok = results.filter((result) => result.ok)
  const failed = results.filter((result) => !result.ok)
  const latencies = ok.map((result) => result.ms).sort((left, right) => left - right)
  const averageMs = ok.reduce((sum, result) => sum + result.ms, 0) / Math.max(1, ok.length)
  const failureRate = results.length === 0 ? 1 : failed.length / results.length
  const endpointSummary = new Map()

  for (const result of results) {
    const key = `${result.method} ${result.path}`
    const summary = endpointSummary.get(key) || { total: 0, failed: 0, maxMs: 0 }
    summary.total += 1
    summary.failed += result.ok ? 0 : 1
    summary.maxMs = Math.max(summary.maxMs, result.ms)
    endpointSummary.set(key, summary)
  }

  const passSummaries = []
  for (let pass = 1; pass <= readPasses; pass += 1) {
    const passResults = results.filter((result) => result.pass === pass)
    const passOk = passResults.filter((result) => result.ok)
    const passFailed = passResults.filter((result) => !result.ok)
    const passLatencies = passOk.map((result) => result.ms).sort((left, right) => left - right)
    passSummaries.push({
      pass,
      total: passResults.length,
      ok: passOk.length,
      failed: passFailed.length,
      averageMs: Number((passOk.reduce((sum, result) => sum + result.ms, 0) / Math.max(1, passOk.length)).toFixed(2)),
      p95Ms: Number(percentile(passLatencies, 0.95).toFixed(2)),
      maxMs: Number((passLatencies.at(-1) || 0).toFixed(2)),
    })
  }

  const report = {
    baseUrl,
    total: results.length,
    ok: ok.length,
    failed: failed.length,
    failureRate: Number(failureRate.toFixed(4)),
    averageMs: Number(averageMs.toFixed(2)),
    p95Ms: Number(percentile(latencies, 0.95).toFixed(2)),
    maxMs: Number((latencies.at(-1) || 0).toFixed(2)),
    authenticated,
    projectId: projectId || null,
    createdProject,
    readPasses,
    passSummaries,
    endpoints: [...endpointSummary.entries()].map(([endpoint, summary]) => ({
      endpoint,
      total: summary.total,
      failed: summary.failed,
      maxMs: Number(summary.maxMs.toFixed(2)),
    })),
    failures: failed.slice(0, 5),
  }

  console.log(JSON.stringify(report, null, 2))

  if (createdProject && shouldCleanupProject && projectId > 0) {
    const deleteResult = await request('DELETE', `/api/projects/${projectId}`)
    if (!deleteResult.ok) {
      console.error(`Smoke project cleanup failed: HTTP ${deleteResult.status} in ${Math.round(deleteResult.ms)} ms`)
      process.exitCode = 1
    }
  }

  if (failureRate > maxFailureRate || report.p95Ms > maxP95Ms) {
    process.exitCode = 1
  }
}

await main()
