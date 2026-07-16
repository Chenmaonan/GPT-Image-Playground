import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RestrictedAgentExecution, RestrictedAgentPlan } from '../types'
import { createRestrictedAgentPlan, executeRestrictedAgentPlan } from './agentExecutor'

const plan: RestrictedAgentPlan = {
  id: 'plan-1',
  version: 3,
  status: 'awaiting_confirmation',
  expiresAt: '2099-01-01T00:00:00.000Z',
  originalRequest: '生成海报',
  summary: '产品海报',
  steps: [{ title: '生成图片', operation: 'generate' }],
  generation: {
    exactPrompt: '完整产品海报提示词',
    action: 'generate',
    size: '1024x1024',
    quality: 'high',
    outputFormat: 'png',
    outputCompression: null,
    imageCount: 1,
  },
  inputs: [],
  assumptions: [],
  warnings: [],
  policyVersion: 'v1',
}

const execution: RestrictedAgentExecution = {
  id: 'execution-1',
  planId: plan.id,
  status: 'queued',
  cancelRequested: false,
  error: null,
  outputAssets: [],
  createdAt: '2026-07-16T00:00:00.000Z',
  startedAt: null,
  completedAt: null,
  updatedAt: '2026-07-16T00:00:00.000Z',
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('restricted Agent gateway client', () => {
  it('creates a plan with the allowlisted multipart fields only', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { enabled: true, csrfToken: 'csrf-1' } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: plan }), { status: 200 }))

    const result = await createRestrictedAgentPlan({
      request: '生成海报',
      size: '1024x1024',
      quality: 'high',
      outputFormat: 'png',
      outputCompression: null,
      imageCount: 1,
      references: [{ dataUrl: 'data:image/png;base64,aW1hZ2U=' }],
    })

    expect(result).toEqual(plan)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/agent-api/v1/capabilities')
    const [, init] = fetchMock.mock.calls[1]!
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/agent-api/v1/plans')
    expect(init?.headers).toMatchObject({ 'X-CSRF-Token': 'csrf-1' })
    const body = init?.body as FormData
    expect([...body.keys()].sort()).toEqual(['imageCount', 'outputFormat', 'quality', 'reference', 'request', 'size'])
    expect(body.get('request')).toBe('生成海报')
    expect(body.has('model')).toBe(false)
    expect(body.has('tools')).toBe(false)
    expect(body.has('upstream')).toBe(false)
  })

  it('confirms by plan id and version without sending prompt or parameters', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: execution }), { status: 200 }))

    const result = await executeRestrictedAgentPlan(plan)

    expect(result).toEqual(execution)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/agent-api/v1/plans/plan-1/execute')
    expect(init?.method).toBe('POST')
    expect(init?.body).toBeUndefined()
    expect(init?.headers).toMatchObject({ 'If-Match': '"3"', 'X-CSRF-Token': 'csrf-1' })
  })
})
