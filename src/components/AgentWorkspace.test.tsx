import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { TaskRecord } from '../types'
import { DEFAULT_PARAMS } from '../types'

const tasks: TaskRecord[] = [
  {
    id: 'task-new',
    prompt: '新任务',
    params: { ...DEFAULT_PARAMS },
    inputImageIds: [],
    outputImages: [],
    status: 'running',
    error: null,
    createdAt: 2,
    finishedAt: null,
    elapsed: null,
  },
  {
    id: 'task-old',
    prompt: '旧任务',
    params: { ...DEFAULT_PARAMS },
    inputImageIds: [],
    outputImages: [],
    status: 'done',
    error: null,
    createdAt: 1,
    finishedAt: 2,
    elapsed: 1,
  },
]

vi.mock('../store', () => ({
  useStore: <T,>(selector: (state: { tasks: TaskRecord[] }) => T) => selector({ tasks }),
}))
vi.mock('./AgentHistoryPanel', () => ({
  default: ({ activeTaskId }: { activeTaskId: string | null }) => <div data-component="agent-history" data-active-task={activeTaskId ?? ''} />,
}))
vi.mock('./AgentMainWorkspace', () => ({
  default: ({ task }: { task: TaskRecord | null }) => <div data-component="agent-main" data-task={task?.id ?? ''} />,
}))
vi.mock('./AgentTemplateRail', () => ({
  default: () => <div data-component="agent-templates" />,
}))

import AgentWorkspace from './AgentWorkspace'
import { getNextAgentTaskIdAfterRemoval } from './AgentWorkspace'

describe('AgentWorkspace', () => {
  it('renders mobile segments and desktop three-column regions for the selected task', () => {
    const markup = renderToStaticMarkup(
      <AgentWorkspace activeTaskId="task-old" onActiveTaskChange={vi.fn()} />,
    )

    expect(markup).toContain('aria-label="Agent 工作台分段"')
    expect(markup).toContain('历史')
    expect(markup).toContain('工作区')
    expect(markup).toContain('模板')
    expect(markup).toContain('data-component="agent-history"')
    expect(markup).toContain('data-component="agent-main"')
    expect(markup).toContain('data-component="agent-templates"')
    expect(markup).toContain('data-task="task-old"')
    expect(markup).toContain('grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)_minmax(18rem,22rem)]')
    expect(markup).toContain('2xl:grid-cols-[minmax(22rem,26rem)_minmax(0,1fr)_minmax(19rem,23rem)]')
  })

  it('selects the adjacent task after the active task is removed', () => {
    expect(getNextAgentTaskIdAfterRemoval(['a', 'b', 'c'], ['b', 'c'], 'a')).toBe('b')
    expect(getNextAgentTaskIdAfterRemoval(['a', 'b', 'c'], ['a', 'c'], 'b')).toBe('c')
    expect(getNextAgentTaskIdAfterRemoval(['a', 'b', 'c'], ['a', 'b'], 'c')).toBe('b')
    expect(getNextAgentTaskIdAfterRemoval(['a'], [], 'a')).toBeNull()
  })
})
