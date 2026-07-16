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
    submitTask: vi.fn<() => Promise<string | null>>(),
  }
})

vi.mock('../store', () => ({
  submitTask: storeMock.submitTask,
  useStore: {
    getState: () => storeMock.state,
  },
}))

import { storeBackedAgentExecutor } from './agentExecutor'

describe('storeBackedAgentExecutor', () => {
  beforeEach(() => {
    storeMock.state.inputImages = []
    storeMock.state.setPrompt.mockClear()
    storeMock.state.setParams.mockClear()
    storeMock.state.showToast.mockClear()
    storeMock.submitTask.mockReset()
  })

  it('delegates to submitTask and returns the created task id', async () => {
    storeMock.state.inputImages = [{ id: 'image-a', dataUrl: 'data:image/png;base64,a' }]
    storeMock.submitTask.mockResolvedValue('task-1')

    const result = await storeBackedAgentExecutor.submit({
      prompt: '生成海报',
      inputImageIds: ['image-a'],
      params: { ...DEFAULT_PARAMS, size: '1024x1024' },
    })

    expect(result).toBe('task-1')
    expect(storeMock.state.setPrompt).toHaveBeenCalledWith('生成海报')
    expect(storeMock.state.setParams).toHaveBeenCalledWith({ ...DEFAULT_PARAMS, size: '1024x1024' })
    expect(storeMock.submitTask).toHaveBeenCalledTimes(1)
  })

  it('rejects requests that do not match current input images', async () => {
    storeMock.state.inputImages = [{ id: 'image-a', dataUrl: 'data:image/png;base64,a' }]

    const result = await storeBackedAgentExecutor.submit({
      prompt: '生成海报',
      inputImageIds: ['other-image'],
      params: { ...DEFAULT_PARAMS },
    })

    expect(result).toBeNull()
    expect(storeMock.submitTask).not.toHaveBeenCalled()
    expect(storeMock.state.showToast).toHaveBeenCalledWith('Agent 请求与当前输入图片不一致，未提交任务', 'error')
  })
})
