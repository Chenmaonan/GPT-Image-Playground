import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { RestrictedAgentPlan } from '../types'
import AgentPlanCard from './AgentPlanCard'

const plan: RestrictedAgentPlan = {
  id: 'plan-1',
  version: 2,
  status: 'awaiting_confirmation',
  expiresAt: '2099-01-01T00:00:00.000Z',
  originalRequest: '生成海报',
  summary: '生成产品发布海报',
  steps: [{ title: '使用确认后的参数生成一张图片', operation: 'generate' }],
  generation: {
    exactPrompt: '一张极简产品发布海报',
    action: 'generate',
    size: '1024x1024',
    quality: 'high',
    outputFormat: 'png',
    outputCompression: null,
    imageCount: 1,
  },
  inputs: [],
  assumptions: ['使用中性背景'],
  warnings: ['图片生成会消耗服务端额度'],
  policyVersion: 'v1',
}

describe('AgentPlanCard', () => {
  it('shows the exact frozen plan and requires an explicit confirmation action', () => {
    const markup = renderToStaticMarkup(
      <AgentPlanCard plan={plan} onConfirm={vi.fn()} onReturnToEditing={vi.fn()} />,
    )

    expect(markup).toContain('等待确认')
    expect(markup).toContain('一张极简产品发布海报')
    expect(markup).toContain('1024x1024')
    expect(markup).toContain('图片生成会消耗服务端额度')
    expect(markup).toContain('返回修改')
    expect(markup).toContain('确认并生成')
  })
})
