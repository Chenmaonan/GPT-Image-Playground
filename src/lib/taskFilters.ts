import type { TaskRecord, TaskStatus } from '../types'

export interface TaskFilterOptions {
  searchQuery: string
  filterStatus: 'all' | TaskStatus
  filterFavorite: boolean
}

export function filterAndSortTasks(tasks: TaskRecord[], options: TaskFilterOptions): TaskRecord[] {
  const q = options.searchQuery.trim().toLowerCase()

  return [...tasks]
    .sort((a, b) => b.createdAt - a.createdAt)
    .filter((task) => {
      if (options.filterFavorite && !task.isFavorite) return false
      if (options.filterStatus !== 'all' && task.status !== options.filterStatus) return false
      if (!q) return true

      const prompt = (task.prompt || '').toLowerCase()
      const paramStr = JSON.stringify(task.params).toLowerCase()
      return prompt.includes(q) || paramStr.includes(q)
    })
}
