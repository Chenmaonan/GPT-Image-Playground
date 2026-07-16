import type { ApiProfile, AppSettings } from '../types'
import { getActiveApiProfile } from './apiProfiles'

export const SERVER_MANAGED_PROFILE_ID = 'server-managed-openai'
export const DEFAULT_SERVER_API_PROXY_PATH = '/api-proxy'
export const SERVER_API_CONFIG_UNAVAILABLE_MESSAGE = '服务端 API 配置不可用，请联系部署管理员'

interface DisabledServerApiConfig {
  enabled: false
}

interface EnabledServerApiConfig {
  enabled: true
  provider: 'openai'
  model: string
  apiMode: 'images' | 'responses'
  codexCli: boolean
  responseFormatB64Json: boolean
  timeoutSeconds: number
  proxyPath: string
}

export interface PublicRuntimeConfig {
  version: 1
  serverApi: DisabledServerApiConfig | EnabledServerApiConfig
}

export type RuntimeConfigState =
  | { status: 'loading' }
  | { status: 'ready'; config: PublicRuntimeConfig }
  | { status: 'error'; error: string }

const TOP_LEVEL_KEYS = new Set(['version', 'serverApi'])
const SERVER_API_KEYS = new Set([
  'enabled',
  'provider',
  'model',
  'apiMode',
  'codexCli',
  'responseFormatB64Json',
  'timeoutSeconds',
  'proxyPath',
])
const SAFE_PROXY_PATH_SEGMENT = /^[A-Za-z0-9._~-]+$/

let runtimeState: RuntimeConfigState = { status: 'loading' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function assertAllowedKeys(record: Record<string, unknown>, allowedKeys: Set<string>, label: string) {
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    throw new Error(`${label} 包含不允许的字段`)
  }
}

function normalizeProxyPath(value: unknown): string {
  if (value === undefined) return DEFAULT_SERVER_API_PROXY_PATH
  if (typeof value !== 'string') throw new Error('serverApi.proxyPath 必须是字符串')

  const trimmed = value.trim()
  if (!trimmed || trimmed === '/') throw new Error('serverApi.proxyPath 不能为空或根路径')
  if (/^[a-z][a-z\d+.-]*:/i.test(trimmed) || trimmed.startsWith('//')) {
    throw new Error('serverApi.proxyPath 必须是同源路径')
  }
  if (/[?#\\\s]/.test(trimmed)) throw new Error('serverApi.proxyPath 包含非法字符')

  const segments = trimmed.split('/').filter(Boolean)
  if (!segments.length) throw new Error('serverApi.proxyPath 不能为空')

  for (const segment of segments) {
    if (segment === '.' || segment === '..' || !SAFE_PROXY_PATH_SEGMENT.test(segment)) {
      throw new Error('serverApi.proxyPath 包含非法路径段')
    }
  }

  return `/${segments.join('/')}`
}

function parsePublicRuntimeConfig(raw: unknown): PublicRuntimeConfig {
  if (!isRecord(raw)) throw new Error('运行时配置必须是对象')
  assertAllowedKeys(raw, TOP_LEVEL_KEYS, '运行时配置')
  if (raw.version !== 1) throw new Error('不支持的运行时配置版本')
  if (!isRecord(raw.serverApi)) throw new Error('serverApi 配置缺失')

  const serverApi = raw.serverApi
  assertAllowedKeys(serverApi, SERVER_API_KEYS, 'serverApi')
  if (typeof serverApi.enabled !== 'boolean') throw new Error('serverApi.enabled 必须是布尔值')
  if (!serverApi.enabled) {
    return { version: 1, serverApi: { enabled: false } }
  }

  if (serverApi.provider !== 'openai') throw new Error('serverApi.provider 必须是 openai')
  if (typeof serverApi.model !== 'string' || !serverApi.model.trim()) {
    throw new Error('serverApi.model 不能为空')
  }
  if (serverApi.apiMode !== 'images' && serverApi.apiMode !== 'responses') {
    throw new Error('serverApi.apiMode 必须是 images 或 responses')
  }
  if (typeof serverApi.codexCli !== 'boolean') throw new Error('serverApi.codexCli 必须是布尔值')
  if (typeof serverApi.responseFormatB64Json !== 'boolean') {
    throw new Error('serverApi.responseFormatB64Json 必须是布尔值')
  }
  if (
    typeof serverApi.timeoutSeconds !== 'number'
    || !Number.isFinite(serverApi.timeoutSeconds)
    || serverApi.timeoutSeconds < 10
    || serverApi.timeoutSeconds > 600
  ) {
    throw new Error('serverApi.timeoutSeconds 必须在 10 到 600 之间')
  }

  return {
    version: 1,
    serverApi: {
      enabled: true,
      provider: 'openai',
      model: serverApi.model.trim(),
      apiMode: serverApi.apiMode,
      codexCli: serverApi.codexCli,
      responseFormatB64Json: serverApi.responseFormatB64Json,
      timeoutSeconds: serverApi.timeoutSeconds,
      proxyPath: normalizeProxyPath(serverApi.proxyPath),
    },
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function initializeRuntimeConfig(raw: unknown): RuntimeConfigState {
  try {
    runtimeState = { status: 'ready', config: parsePublicRuntimeConfig(raw) }
  } catch (error) {
    runtimeState = { status: 'error', error: getErrorMessage(error) }
  }
  return runtimeState
}

export async function loadRuntimeConfig(): Promise<void> {
  runtimeState = { status: 'loading' }
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}runtime-config.json`, { cache: 'no-store' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    initializeRuntimeConfig(await response.json())
  } catch (error) {
    runtimeState = { status: 'error', error: getErrorMessage(error) }
  }
}

export function getRuntimeConfigState(): RuntimeConfigState {
  return runtimeState
}

export function isServerApiConfigEnabled(): boolean {
  return runtimeState.status === 'ready' && runtimeState.config.serverApi.enabled
}

export function isServerApiConfigUsable(): boolean {
  return isServerApiConfigEnabled()
}

export function getServerApiProxyPath(): string {
  return runtimeState.status === 'ready' && runtimeState.config.serverApi.enabled
    ? runtimeState.config.serverApi.proxyPath
    : DEFAULT_SERVER_API_PROXY_PATH
}

export function getServerManagedApiProfile(): ApiProfile | null {
  if (runtimeState.status !== 'ready' || !runtimeState.config.serverApi.enabled) return null

  const config = runtimeState.config.serverApi
  return {
    id: SERVER_MANAGED_PROFILE_ID,
    name: '服务端统一配置',
    provider: 'openai',
    baseUrl: `${config.proxyPath}/v1`,
    apiKey: '',
    model: config.model,
    timeout: config.timeoutSeconds,
    apiMode: config.apiMode,
    codexCli: config.codexCli,
    apiProxy: true,
    responseFormatB64Json: config.responseFormatB64Json,
  }
}

export function getEffectiveApiProfile(settings: AppSettings): ApiProfile {
  if (runtimeState.status !== 'ready') throw new Error(SERVER_API_CONFIG_UNAVAILABLE_MESSAGE)
  return getServerManagedApiProfile() ?? getActiveApiProfile(settings)
}

export function getEffectiveSettings(settings: AppSettings): AppSettings {
  if (runtimeState.status !== 'ready') throw new Error(SERVER_API_CONFIG_UNAVAILABLE_MESSAGE)
  const profile = getServerManagedApiProfile()
  if (!profile) return settings

  return {
    ...settings,
    baseUrl: profile.baseUrl,
    apiKey: '',
    model: profile.model,
    timeout: profile.timeout,
    apiMode: profile.apiMode,
    codexCli: profile.codexCli,
    apiProxy: true,
    customProviders: [],
    providerOrder: ['openai'],
    reuseTaskApiProfileTemporarily: false,
    profiles: [profile],
    activeProfileId: profile.id,
  }
}

export function sanitizeSettingsPatchForServerMode(patch: Partial<AppSettings>): Partial<AppSettings> {
  if (runtimeState.status === 'ready' && !runtimeState.config.serverApi.enabled) return patch

  const sanitized: Partial<AppSettings> = {
    reuseTaskApiProfileTemporarily: false,
  }
  if (typeof patch.clearInputAfterSubmit === 'boolean') sanitized.clearInputAfterSubmit = patch.clearInputAfterSubmit
  if (typeof patch.persistInputOnRestart === 'boolean') sanitized.persistInputOnRestart = patch.persistInputOnRestart
  if (typeof patch.alwaysShowRetryButton === 'boolean') sanitized.alwaysShowRetryButton = patch.alwaysShowRetryButton
  if (typeof patch.enterSubmit === 'boolean') sanitized.enterSubmit = patch.enterSubmit
  if (typeof patch.agentStreaming === 'boolean') sanitized.agentStreaming = patch.agentStreaming
  if (typeof patch.agentImageCount === 'number') sanitized.agentImageCount = patch.agentImageCount
  return sanitized
}
