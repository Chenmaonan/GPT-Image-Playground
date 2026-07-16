import { describe, expect, it } from 'vitest'
import type { TaskRecord } from '../types'
import { DEFAULT_PARAMS } from '../types'
import { filterAndSortTasks } from './taskFilters'

function task(id: string, patch: Partial<TaskRecord>): TaskRecord {
  return {
    id,
    prompt: '',
    params: { ...DEFAULT_PARAMS },
    inputImageIds: [],
    outputImages: [],
    status: 'done',
    error: null,
    createdAt: 0,
    finishedAt: null,
    elapsed: null,
    ...patch,
  }
}

describe('filterAndSortTasks', () => {
  it('sorts by newest first and filters by status, favorite and prompt', () => {
    const tasks = [
      task('old', { prompt: '城市夜景', createdAt: 1, status: 'done', isFavorite: true }),
      task('new-error', { prompt: '产品海报', createdAt: 3, status: 'error', isFavorite: true }),
      task('middle', { prompt: '产品展示', createdAt: 2, status: 'done', isFavorite: false }),
    ]

    expect(filterAndSortTasks(tasks, { searchQuery: '', filterStatus: 'all', filterFavorite: false }).map((item) => item.id))
      .toEqual(['new-error', 'middle', 'old'])
    expect(filterAndSortTasks(tasks, { searchQuery: '产品', filterStatus: 'done', filterFavorite: false }).map((item) => item.id))
      .toEqual(['middle'])
    expect(filterAndSortTasks(tasks, { searchQuery: '', filterStatus: 'all', filterFavorite: true }).map((item) => item.id))
      .toEqual(['new-error', 'old'])
  })

  it('searches serialized params', () => {
    const tasks = [
      task('square', { params: { ...DEFAULT_PARAMS, size: '1024x1024' }, createdAt: 1 }),
      task('wide', { params: { ...DEFAULT_PARAMS, size: '1536x1024' }, createdAt: 2 }),
    ]

    expect(filterAndSortTasks(tasks, { searchQuery: '1536', filterStatus: 'all', filterFavorite: false }).map((item) => item.id))
      .toEqual(['wide'])
  })
})
