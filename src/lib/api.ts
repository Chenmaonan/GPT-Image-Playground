import { getCustomProviderDefinition } from './apiProfiles'
import { callFalAiImageApi } from './falAiImageApi'
import { callOpenAICompatibleImageApi } from './openaiCompatibleImageApi'
import type { CallApiOptions, CallApiResult } from './imageApiShared'
import { getEffectiveApiProfile, getEffectiveSettings, getRuntimeConfigState } from './serverApiConfig'

export type { CallApiOptions, CallApiResult } from './imageApiShared'
export { normalizeBaseUrl } from './devProxy'

export async function callImageApi(opts: CallApiOptions): Promise<CallApiResult> {
  const runtimeState = getRuntimeConfigState()
  if (runtimeState.status !== 'ready') {
    throw new Error('服务端 API 配置不可用，请联系部署管理员')
  }

  const settings = getEffectiveSettings(opts.settings)
  const profile = getEffectiveApiProfile(settings)
  const effectiveOptions = { ...opts, settings }
  if (profile.provider === 'fal') return callFalAiImageApi(effectiveOptions, profile)

  return callOpenAICompatibleImageApi(
    effectiveOptions,
    profile,
    getCustomProviderDefinition(settings, profile.provider),
  )
}
