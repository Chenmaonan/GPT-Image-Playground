import { useMemo } from 'react'
import { editOutputs, removeTask, reuseConfig, useStore } from '../store'
import { filterAndSortTasks } from '../lib/taskFilters'
import type { TaskRecord } from '../types'
import SearchBar from './SearchBar'
import TaskCard from './TaskCard'

interface AgentHistoryPanelProps {
  activeTaskId: string | null
  onSelectTask: (taskId: string) => void
}

export default function AgentHistoryPanel({ activeTaskId, onSelectTask }: AgentHistoryPanelProps) {
  const tasks = useStore((s) => s.tasks)
  const searchQuery = useStore((s) => s.searchQuery)
  const filterStatus = useStore((s) => s.filterStatus)
  const filterFavorite = useStore((s) => s.filterFavorite)
  const setConfirmDialog = useStore((s) => s.setConfirmDialog)

  const filteredTasks = useMemo(
    () => filterAndSortTasks(tasks, { searchQuery, filterStatus, filterFavorite }),
    [filterFavorite, filterStatus, searchQuery, tasks],
  )

  const handleDelete = (task: TaskRecord) => {
    setConfirmDialog({
      title: '删除记录',
      message: '确定要删除这条记录吗？关联的图片资源也会被清理（如果没有其他任务引用）。',
      action: () => {
        void removeTask(task)
      },
    })
  }

  return (
    <aside className="flex h-full min-h-0 flex-col" aria-labelledby="agent-history-title">
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50/95 p-4 backdrop-blur dark:border-white/[0.08] dark:bg-gray-950/95">
        <h2 id="agent-history-title" className="text-sm font-semibold text-gray-900 dark:text-gray-100">历史记录</h2>
        <SearchBar variant="compact" className="mt-3" />
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {filteredTasks.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">没有找到匹配的记录</p>
        ) : (
          filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              variant="compact"
              selectionEnabled={false}
              isSelected={task.id === activeTaskId}
              onClick={() => onSelectTask(task.id)}
              onReuse={() => void reuseConfig(task)}
              onEditOutputs={() => void editOutputs(task)}
              onDelete={() => handleDelete(task)}
            />
          ))
        )}
      </div>
    </aside>
  )
}
