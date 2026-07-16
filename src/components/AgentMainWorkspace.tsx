import type { TaskRecord } from '../types'
import TaskDetailContent from './TaskDetailContent'

interface AgentMainWorkspaceProps {
  task: TaskRecord | null
}

export default function AgentMainWorkspace({ task }: AgentMainWorkspaceProps) {
  if (!task) {
    return (
      <section className="flex h-full min-h-[28rem] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/70 p-6 text-center dark:border-white/[0.08] dark:bg-gray-900/70" aria-labelledby="agent-workspace-title">
        <div>
          <h2 id="agent-workspace-title" className="text-base font-semibold text-gray-900 dark:text-gray-100">工作区</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500 dark:text-gray-400">
            输入提示词开始生成，或从右侧模板选择一个起点。生成历史与画廊共享。
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="h-full min-h-0" aria-labelledby="agent-workspace-title">
      <h2 id="agent-workspace-title" className="sr-only">当前任务工作区</h2>
      <TaskDetailContent task={task} presentation="workspace" />
    </section>
  )
}
