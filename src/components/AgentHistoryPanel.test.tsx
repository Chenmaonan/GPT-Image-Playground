import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { TaskRecord } from '../types'
import { DEFAULT_PARAMS } from '../types'

const task: TaskRecord = {
  id: 'task-a',
  prompt: '历史任务',
  params: { ...DEFAULT_PARAMS },
  inputImageIds: [],
  outputImages: [],
  status: 'done',
  error: null,
  createdAt: 1,
  finishedAt: 2,
  elapsed: 1,
}

const capturedTaskCards: Array<{
  variant?: string
  selectionEnabled?: boolean
  isSelected?: boolean
  onClick: () => void
}> = []
const setDetailTaskId = vi.fn()

vi.mock('../store', () => ({
  useStore: <T,>(selector: (state: {
    tasks: TaskRecord[]
    searchQuery: string
    filterStatus: 'all'
    filterFavorite: boolean
    setConfirmDialog: () => void
    setDetailTaskId: typeof setDetailTaskId
  }) => T) => selector({
    tasks: [task],
    searchQuery: '',
    filterStatus: 'all',
    filterFavorite: false,
    setConfirmDialog: vi.fn(),
    setDetailTaskId,
  }),
  reuseConfig: vi.fn(),
  editOutputs: vi.fn(),
  removeTask: vi.fn(),
}))

vi.mock('./SearchBar', () => ({ default: () => <div data-component="search-bar" /> }))
vi.mock('./TaskCard', () => ({
  default: (props: {
    variant?: string
    selectionEnabled?: boolean
    isSelected?: boolean
    onClick: () => void
  }) => {
    capturedTaskCards.push(props)
    return <article data-component="task-card" />
  },
}))

import AgentHistoryPanel from './AgentHistoryPanel'

afterEach(() => {
  capturedTaskCards.length = 0
  setDetailTaskId.mockClear()
})

describe('AgentHistoryPanel', () => {
  it('selects Agent task without opening the detail modal', () => {
    const onSelectTask = vi.fn()
    const markup = renderToStaticMarkup(
      <AgentHistoryPanel activeTaskId="task-a" onSelectTask={onSelectTask} />,
    )

    expect(markup).toContain('data-component="search-bar"')
    expect(capturedTaskCards).toHaveLength(1)
    expect(capturedTaskCards[0]).toMatchObject({
      variant: 'compact',
      selectionEnabled: false,
      isSelected: true,
    })

    capturedTaskCards[0].onClick()

    expect(onSelectTask).toHaveBeenCalledWith('task-a')
    expect(setDetailTaskId).not.toHaveBeenCalled()
  })
})
