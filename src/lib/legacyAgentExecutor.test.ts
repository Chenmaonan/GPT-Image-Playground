import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_PARAMS } from '../types'

const storeMock = vi.hoisted(() => {
  const state = {
    inputImages: [] as Array<{ id: string; dataUrl: string }>,
    setPrompt: vi.fn(),
    setParams: vi.fn(),
    showToast: vi.fn(),
  }
  return {
    state,
    submitTask: vi.fn<(options?: { onTaskCreated?: (taskId: string) => void }) => Promise<string | null>>(),
  }
})

vi.mock('../store', () => ({
  submitTask: storeMock.submitTask,
  useStore: {
    getState: () => storeMock.state,
  },
}))

import { callAgentResponsesImageApi, storeBackedAgentExecutor } from './legacyAgentExecutor'

describe('storeBackedAgentExecutor', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    storeMock.state.inputImages = []
    storeMock.state.setPrompt.mockClear()
    storeMock.state.setParams.mockClear()
    storeMock.state.showToast.mockClear()
    storeMock.submitTask.mockReset()
  })

  it('delegates to submitTask and returns the created task id', async () => {
    storeMock.state.inputImages = [{ id: 'image-a', dataUrl: 'data:image/png;base64,a' }]
    storeMock.submitTask.mockImplementation(async (options) => {
      options?.onTaskCreated?.('task-1')
      return 'task-1'
    })

    const result = await storeBackedAgentExecutor.submit({
      prompt: '生成海报',
      inputImageIds: ['image-a'],
      params: { ...DEFAULT_PARAMS, size: '1024x1024' },
      stream: true,
      imageCount: 2,
    })

    expect(result).toBe('task-1')
    expect(storeMock.state.setPrompt).toHaveBeenCalledWith('生成海报')
    expect(storeMock.state.setParams).toHaveBeenCalledWith({ ...DEFAULT_PARAMS, size: '1024x1024', n: 2 })
    expect(storeMock.submitTask).toHaveBeenCalledTimes(1)
    expect(storeMock.submitTask.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      callApi: expect.any(Function),
      onTaskCreated: expect.any(Function),
    }))
  })

  it('rejects requests that do not match current input images', async () => {
    storeMock.state.inputImages = [{ id: 'image-a', dataUrl: 'data:image/png;base64,a' }]

    const result = await storeBackedAgentExecutor.submit({
      prompt: '生成海报',
      inputImageIds: ['other-image'],
      params: { ...DEFAULT_PARAMS },
      stream: false,
      imageCount: 1,
    })

    expect(result).toBeNull()
    expect(storeMock.submitTask).not.toHaveBeenCalled()
    expect(storeMock.state.showToast).toHaveBeenCalledWith('Agent 请求与当前输入图片不一致，未提交任务', 'error')
  })

  it('calls Responses API without the prompt rewrite guard in agent mode', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      output: [{
        type: 'image_generation_call',
        result: 'aW1hZ2U=',
        revised_prompt: '完整海报提示词',
      }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    const result = await callAgentResponsesImageApi({
      settings: {
        baseUrl: 'https://api.example.com/v1',
        apiKey: 'test-key',
        model: 'gpt-5.5',
        timeout: 60,
        apiMode: 'responses',
        codexCli: false,
        apiProxy: false,
        customProviders: [],
        providerOrder: undefined,
        clearInputAfterSubmit: false,
        persistInputOnRestart: true,
        reuseTaskApiProfileTemporarily: false,
        alwaysShowRetryButton: false,
        enterSubmit: false,
        agentStreaming: false,
        agentImageCount: 1,
        profiles: [{
          id: 'default-openai',
          name: '默认',
          provider: 'openai',
          baseUrl: 'https://api.example.com/v1',
          apiKey: 'test-key',
          model: 'gpt-5.5',
          timeout: 60,
          apiMode: 'responses',
          codexCli: false,
          apiProxy: false,
        }],
        activeProfileId: 'default-openai',
      },
      prompt: '生成海报',
      params: { ...DEFAULT_PARAMS, n: 1 },
      inputImageDataUrls: [],
    }, { stream: false, imageCount: 1 })

    expect(result.images).toHaveLength(1)
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(body.input).toBe('生成海报')
    expect(body.input).not.toContain('Do not rewrite it')
    expect(body.tools[0]).toMatchObject({ type: 'image_generation', action: 'generate' })
    expect(body.tool_choice).toBe('required')
    expect(body.stream).toBeUndefined()
  })
})
