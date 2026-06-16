import http from 'k6/http'
import { check, group, sleep } from 'k6'

const BASE_URL = (__ENV.STORYDB_BASE_URL || 'http://localhost:50201').replace(/\/$/, '')
const EMAIL = __ENV.STORYDB_EMAIL
const PASSWORD = __ENV.STORYDB_PASSWORD
const PROJECT_ID = Number(__ENV.STORYDB_PROJECT_ID || 0)
const EXPORT_OBJECT_IDS = (__ENV.STORYDB_EXPORT_OBJECT_IDS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)
const EXPORT_MODE = (__ENV.STORYDB_EXPORT_MODE || 'direct').toLowerCase()

export const options = {
  scenarios: {
    browsing: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: Number(__ENV.STORYDB_LOAD_VUS || 10) },
        { duration: __ENV.STORYDB_LOAD_DURATION || '2m', target: Number(__ENV.STORYDB_LOAD_VUS || 10) },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500'],
    'http_req_duration{endpoint:project-data}': ['p(95)<2000'],
    'http_req_duration{endpoint:export}': ['p(95)<7000'],
  },
}

function requireEnv() {
  if (!EMAIL || !PASSWORD || PROJECT_ID <= 0) {
    throw new Error('Set STORYDB_EMAIL, STORYDB_PASSWORD and STORYDB_PROJECT_ID before running this script.')
  }
}

function login() {
  const response = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'auth' },
    },
  )

  check(response, {
    'login ok': (result) => result.status === 200,
  })
}

function getJson(path, endpoint) {
  const response = http.get(`${BASE_URL}${path}`, { tags: { endpoint } })
  check(response, {
    [`${endpoint} status ok`]: (result) => result.status >= 200 && result.status < 300,
  })
  return response
}

function getExportIds() {
  if (EXPORT_OBJECT_IDS.length > 0) {
    return EXPORT_OBJECT_IDS
  }

  const response = getJson(`/api/projects/${PROJECT_ID}/objects/summaries`, 'project-data')
  if (response.status !== 200) {
    return []
  }

  try {
    const summaries = response.json()
    return summaries.slice(0, Number(__ENV.STORYDB_EXPORT_OBJECT_LIMIT || 5)).map((storyObject) => storyObject.id)
  } catch {
    return []
  }
}

export function setup() {
  requireEnv()
  login()
  return { exportObjectIds: getExportIds() }
}

export default function (data) {
  login()

  group('profile and project shell', () => {
    getJson('/health', 'diagnostics')
    getJson('/metrics', 'diagnostics')
    const prometheusResponse = http.get(`${BASE_URL}/metrics/prometheus`, { tags: { endpoint: 'diagnostics' } })
    check(prometheusResponse, {
      'prometheus metrics ok': (result) => result.status === 200,
      'prometheus contains api metrics': (result) => result.body.includes('storydb_api_requests_total'),
      'prometheus contains active request metrics': (result) => result.body.includes('storydb_api_active_requests'),
      'prometheus contains cache metrics': (result) => result.body.includes('storydb_cache_singleflight_hits_total'),
      'prometheus contains audit queue metrics': (result) => result.body.includes('storydb_audit_log_queue_dropped_total'),
      'prometheus contains export queue metrics': (result) => result.body.includes('storydb_export_job_queue_depth'),
      'prometheus contains gc metrics': (result) => result.body.includes('storydb_process_gc_allocated_bytes_total'),
      'prometheus contains threadpool metrics': (result) => result.body.includes('storydb_threadpool_worker_threads_used'),
    })
    getJson('/api/auth/me', 'auth')
    getJson('/api/projects', 'project-list')
  })

  group('project database', () => {
    http.batch([
      ['GET', `${BASE_URL}/api/projects/${PROJECT_ID}/objects/summaries`, null, { tags: { endpoint: 'project-data' } }],
      ['GET', `${BASE_URL}/api/projects/${PROJECT_ID}/catalogs`, null, { tags: { endpoint: 'project-data' } }],
      ['GET', `${BASE_URL}/api/projects/${PROJECT_ID}/attribute-definitions`, null, { tags: { endpoint: 'project-data' } }],
      ['GET', `${BASE_URL}/api/projects/${PROJECT_ID}/structures`, null, { tags: { endpoint: 'project-data' } }],
      ['GET', `${BASE_URL}/api/projects/${PROJECT_ID}/structures/usages`, null, { tags: { endpoint: 'project-data' } }],
      ['GET', `${BASE_URL}/api/projects/${PROJECT_ID}/structures/assignments`, null, { tags: { endpoint: 'project-data' } }],
    ]).forEach((response) => {
      check(response, {
        'project batch ok': (result) => result.status >= 200 && result.status < 300,
      })
    })
  })

  group('graphs and timeline', () => {
    http.batch([
      ['GET', `${BASE_URL}/api/projects/${PROJECT_ID}/relations/graph`, null, { tags: { endpoint: 'graph' } }],
      ['GET', `${BASE_URL}/api/projects/${PROJECT_ID}/relations/layout`, null, { tags: { endpoint: 'graph' } }],
      ['GET', `${BASE_URL}/api/projects/${PROJECT_ID}/timeline/events`, null, { tags: { endpoint: 'timeline' } }],
      ['GET', `${BASE_URL}/api/projects/${PROJECT_ID}/timeline/links`, null, { tags: { endpoint: 'timeline' } }],
      ['GET', `${BASE_URL}/api/projects/${PROJECT_ID}/timeline/layout`, null, { tags: { endpoint: 'timeline' } }],
    ]).forEach((response) => {
      check(response, {
        'graph/timeline batch ok': (result) => result.status >= 200 && result.status < 300,
      })
    })
  })

  group('word export', () => {
    const objectIds = data.exportObjectIds || []
    if (objectIds.length === 0) {
      return
    }

    if (EXPORT_MODE === 'async') {
      const startResponse = http.post(
        `${BASE_URL}/api/projects/${PROJECT_ID}/exports/dossiers/jobs`,
        JSON.stringify({ objectIds }),
        {
          headers: { 'Content-Type': 'application/json' },
          tags: { endpoint: 'export' },
          timeout: __ENV.STORYDB_EXPORT_TIMEOUT || '30s',
        },
      )

      check(startResponse, {
        'export job accepted': (result) => result.status === 202,
      })

      if (startResponse.status !== 202) {
        return
      }

      const job = startResponse.json()
      for (let attempt = 0; attempt < Number(__ENV.STORYDB_EXPORT_JOB_POLLS || 10); attempt += 1) {
        const statusResponse = http.get(
          `${BASE_URL}/api/projects/${PROJECT_ID}/exports/dossiers/jobs/${job.id}`,
          { tags: { endpoint: 'export-status' } },
        )
        const status = statusResponse.status === 200 ? statusResponse.json('status') : ''
        if (status === 'succeeded') {
          const downloadResponse = http.get(
            `${BASE_URL}/api/projects/${PROJECT_ID}/exports/dossiers/jobs/${job.id}/download`,
            { tags: { endpoint: 'export-download' }, timeout: __ENV.STORYDB_EXPORT_TIMEOUT || '30s' },
          )
          check(downloadResponse, {
            'export job download ok': (result) => result.status === 200,
            'export job download is docx': (result) =>
              String(result.headers['Content-Type'] || '').includes(
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              ),
          })
          return
        }

        if (status === 'failed' || status === 'invalid') {
          check(statusResponse, {
            'export job did not fail': () => false,
          })
          return
        }

        sleep(Number(__ENV.STORYDB_EXPORT_JOB_POLL_SLEEP_SECONDS || 0.5))
      }

      check(startResponse, {
        'export job completed before poll limit': () => false,
      })
      return
    }

    const query = objectIds.map((id) => `objectIds=${encodeURIComponent(id)}`).join('&')
    const response = http.get(`${BASE_URL}/api/projects/${PROJECT_ID}/exports/dossiers.docx?${query}`, {
      tags: { endpoint: 'export' },
      timeout: __ENV.STORYDB_EXPORT_TIMEOUT || '30s',
    })

    check(response, {
      'export ok': (result) => result.status === 200,
      'export is docx': (result) =>
        String(result.headers['Content-Type'] || '').includes(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ),
    })
  })

  sleep(Number(__ENV.STORYDB_LOAD_SLEEP_SECONDS || 1))
}
