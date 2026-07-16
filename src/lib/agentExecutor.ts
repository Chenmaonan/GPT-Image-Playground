import type { TaskParams } from '../types'
import { submitTask, useStore } from '../store'

export interface AgentGenerationRequest {
  prompt: string
  inputImageIds: string[]
  params: TaskParams
}

export interface AgentExecutor {
  submit(request: AgentGenerationRequest): Promise<string | null>
}

export const storeBackedAgentExecutor: AgentExecutor = {
  async submit(request) {
    const state = useStore.getState()
    const currentInputImageIds = state.inputImages.map((image) => image.id)
    const sameInputImages =
      currentInputImageIds.length === request.inputImageIds.length &&
      currentInputImageIds.every((id, index) => id === request.inputImageIds[index])

    if (!sameInputImages) {
      state.showToast('Agent 请求与当前输入图片不一致，未提交任务', 'error')
      return null
    }

    state.setPrompt(request.prompt)
    state.setParams(request.params)
    return submitTask()
  },
}
