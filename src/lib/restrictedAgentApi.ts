import type {
  RestrictedAgentCapabilities,
  RestrictedAgentExecution,
  RestrictedAgentPlan,
  TaskParams,
} from '../types'
import { getRestrictedAgentBasePath } from './serverApiConfig'

function getAgentApiBase() {
  return getRestrictedAgentBasePath()
}

interface ApiEnvelope<T> {
  data: T
}

export interface RestrictedAgentPlanRequest {
  request: string
  size: string
  quality: TaskParams['quality']
  outputFormat: TaskParams['output_format']
  outputCompression: number | null
  imageCount: number
  references: Array<{ dataUrl: string; fileName?: string }>
  maskTarget?: { dataUrl: string; fileName?: string }
  mask?: { dataUrl: string; fileName?: string }
}

export interface RestrictedAgentExecutionEvent {
  type:
    | 'execution.queued'
    | 'execution.started'
    | 'execution.completed'
    | 'execution.failed'
    | 'execution.cancelled'
    | 'execution.failed_unknown'
    | 'asset.ready'
  data: Record<string, unknown>
}

let capabilities: RestrictedAgentCapabilities | null = null
let capabilitiesPromise: Promise<RestrictedAgentCapabilities> | null = null

function getErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback
  const record = payload as Record<string, unknown>
  const error = record.error
  if (typeof error === 'string' && error.trim()) return error
  if (error && typeof error === 'object') {
    const message = (error as Record<string, unknown>).message
    if (typeof message === 'string' && message.trim()) return message
  }
  const message = record.message
  return typeof message === 'string' && message.trim() ? message : fallback
}

async function readEnvelope<T>(response: Response): Promise<T> {
  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    // 非 JSON 错误由统一状态文本兜底。
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, `Agent Gateway 请求失败（HTTP ${response.status}）`))
  }
  if (!payload || typeof payload !== 'object' || !('data' in payload)) {
    throw new Error('Agent Gateway 返回格式无效')
  }
  return (payload as ApiEnvelope<T>).data
}

function dataUrlToFile(dataUrl: string, fileName: string): File {
  const match = /^data:([^;,]+);base64,(.*)$/s.exec(dataUrl)
  if (!match) throw new Error('参考图格式无效')
  const binary = atob(match[2])
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new File([bytes], fileName, { type: match[1] })
}

function extensionForDataUrl(dataUrl: string) {
  const mime = /^data:([^;,]+)/.exec(dataUrl)?.[1]
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/webp') return 'webp'
  return 'png'
}

export async function getRestrictedAgentCapabilities(options: { refresh?: boolean } = {}) {
  if (!options.refresh && capabilities) return capabilities
  if (!options.refresh && capabilitiesPromise) return capabilitiesPromise

  capabilitiesPromise = fetch(`${getAgentApiBase()}/capabilities`, {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
    .then((response) => readEnvelope<RestrictedAgentCapabilities>(response))
    .then((next) => {
      if (!next.enabled) throw new Error('受限 Agent 当前未启用')
      if (!next.csrfToken) throw new Error('Agent Gateway 未返回 CSRF Token')
      capabilities = next
      return next
    })
    .finally(() => {
      capabilitiesPromise = null
    })

  return capabilitiesPromise
}

async function postWithCsrf<T>(path: string, init: Omit<RequestInit, 'method'> = {}) {
  const capability = await getRestrictedAgentCapabilities()
  const request = () => fetch(`${getAgentApiBase()}${path}`, {
    ...init,
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'X-CSRF-Token': capability.csrfToken,
      ...init.headers,
    },
  })

  let response = await request()
  if (response.status === 403) {
    const refreshed = await getRestrictedAgentCapabilities({ refresh: true })
    response = await fetch(`${getAgentApiBase()}${path}`, {
      ...init,
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'X-CSRF-Token': refreshed.csrfToken,
        ...init.headers,
      },
    })
  }
  return readEnvelope<T>(response)
}

export async function createRestrictedAgentPlan(input: RestrictedAgentPlanRequest) {
  const form = new FormData()
  form.set('request', input.request)
  form.set('size', input.size)
  form.set('quality', input.quality)
  form.set('outputFormat', input.outputFormat)
  if (input.outputCompression != null) form.set('outputCompression', String(input.outputCompression))
  form.set('imageCount', String(input.imageCount))

  input.references.forEach((image, index) => {
    const name = image.fileName ?? `reference-${index + 1}.${extensionForDataUrl(image.dataUrl)}`
    form.append('reference', dataUrlToFile(image.dataUrl, name))
  })
  if (input.maskTarget) {
    const name = input.maskTarget.fileName ?? `mask-target.${extensionForDataUrl(input.maskTarget.dataUrl)}`
    form.set('mask_target', dataUrlToFile(input.maskTarget.dataUrl, name))
  }
  if (input.mask) {
    const name = input.mask.fileName ?? `mask.${extensionForDataUrl(input.mask.dataUrl)}`
    form.set('mask', dataUrlToFile(input.mask.dataUrl, name))
  }

  return postWithCsrf<RestrictedAgentPlan>('/plans', { body: form })
}

export function getRestrictedAgentPlan(planId: string) {
  return fetch(`${getAgentApiBase()}/plans/${encodeURIComponent(planId)}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  }).then((response) => readEnvelope<RestrictedAgentPlan>(response))
}

export function executeRestrictedAgentPlan(plan: RestrictedAgentPlan) {
  return postWithCsrf<RestrictedAgentExecution>(`/plans/${encodeURIComponent(plan.id)}/execute`, {
    headers: { 'If-Match': `"${plan.version}"` },
  })
}

export function getRestrictedAgentExecution(executionId: string) {
  return fetch(`${getAgentApiBase()}/executions/${encodeURIComponent(executionId)}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  }).then((response) => readEnvelope<RestrictedAgentExecution>(response))
}

export function cancelRestrictedAgentExecution(executionId: string) {
  return postWithCsrf<RestrictedAgentExecution>(`/executions/${encodeURIComponent(executionId)}/cancel`)
}

export async function getRestrictedAgentAsset(assetId: string) {
  const response = await fetch(`${getAgentApiBase()}/assets/${encodeURIComponent(assetId)}`, {
    credentials: 'same-origin',
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Agent 图片资源读取失败（HTTP ${response.status}）`)
  return response.blob()
}

export function subscribeRestrictedAgentExecution(
  executionId: string,
  listener: (event: RestrictedAgentExecutionEvent) => void,
  onDisconnect: () => void,
) {
  const source = new EventSource(`${getAgentApiBase()}/executions/${encodeURIComponent(executionId)}/events`, {
    withCredentials: true,
  })
  const eventTypes: RestrictedAgentExecutionEvent['type'][] = [
    'execution.queued',
    'execution.started',
    'execution.completed',
    'execution.failed',
    'execution.cancelled',
    'execution.failed_unknown',
    'asset.ready',
  ]
  const handlers = eventTypes.map((type) => {
    const handler = (event: MessageEvent<string>) => {
      try {
        listener({ type, data: JSON.parse(event.data) as Record<string, unknown> })
      } catch {
        // 无效事件不改变本地状态，后续状态查询会校正。
      }
    }
    source.addEventListener(type, handler as EventListener)
    return { type, handler }
  })
  source.onerror = onDisconnect

  return () => {
    handlers.forEach(({ type, handler }) => source.removeEventListener(type, handler as EventListener))
    source.close()
  }
}
