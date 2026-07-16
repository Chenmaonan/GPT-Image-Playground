import { useEffect, useMemo, useState } from 'react'
import type { TaskRecord } from '../types'
import { subscribeAgentProgress, type AgentProgressEvent, type AgentToolStatus } from '../lib/agentExecutor'
import TaskDetailContent from './TaskDetailContent'

interface AgentMainWorkspaceProps {
  task: TaskRecord | null
}

interface AgentSessionView {
  taskId: string
  prompt: string
  assistantText: string
  toolStatus: AgentToolStatus | null
  toolMessage: string
  partialImages: string[]
  doneImageCount: number | null
  revisedPrompts: string[]
  error: string | null
  stream: boolean
}

function createSessionFromTask(task: TaskRecord): AgentSessionView {
  return {
    taskId: task.id,
    prompt: task.prompt,
    assistantText: '',
    toolStatus: task.status === 'running' ? 'in_progress' : task.status === 'done' ? 'completed' : null,
    toolMessage: task.status === 'running' ? '正在等待 Agent 工具调用结果' : task.status === 'done' ? '图像工具调用完成' : '',
    partialImages: [],
    doneImageCount: task.status === 'done' ? task.outputImages.length : null,
    revisedPrompts: task.revisedPromptByImage ? Object.values(task.revisedPromptByImage) : [],
    error: task.error,
    stream: true,
  }
}

function applyAgentEvent(session: AgentSessionView | undefined, event: AgentProgressEvent, fallbackTaskId: string | null): AgentSessionView | undefined {
  const taskId = event.taskId ?? session?.taskId ?? fallbackTaskId
  if (!taskId) return session

  if (event.type === 'task_created') {
    return {
      taskId: event.taskId,
      prompt: event.prompt,
      assistantText: '',
      toolStatus: 'queued',
      toolMessage: event.stream ? '已提交给 Agent，等待流式响应' : '已提交给 Agent，等待完整响应',
      partialImages: [],
      doneImageCount: null,
      revisedPrompts: [],
      error: null,
      stream: event.stream,
    }
  }

  const current = session ?? {
    taskId,
    prompt: '',
    assistantText: '',
    toolStatus: null,
    toolMessage: '',
    partialImages: [],
    doneImageCount: null,
    revisedPrompts: [],
    error: null,
    stream: true,
  }

  if (event.type === 'assistant_delta') {
    return { ...current, assistantText: `${current.assistantText}${event.text}` }
  }
  if (event.type === 'tool_status') {
    return { ...current, toolStatus: event.status, toolMessage: event.message }
  }
  if (event.type === 'partial_image') {
    return { ...current, partialImages: [...current.partialImages, event.image] }
  }
  if (event.type === 'done') {
    return {
      ...current,
      toolStatus: 'completed',
      toolMessage: `生成完成，共 ${event.imageCount} 张图片`,
      doneImageCount: event.imageCount,
      revisedPrompts: event.revisedPrompts?.filter((item): item is string => Boolean(item?.trim())) ?? current.revisedPrompts,
    }
  }
  if (event.type === 'error') {
    return { ...current, error: event.message, toolMessage: event.message }
  }

  return current
}

export default function AgentMainWorkspace({ task }: AgentMainWorkspaceProps) {
  const [sessions, setSessions] = useState<Record<string, AgentSessionView>>({})
  const activeSession = useMemo(() => {
    if (!task) return null
    return sessions[task.id] ?? createSessionFromTask(task)
  }, [sessions, task])

  useEffect(() => {
    return subscribeAgentProgress((event) => {
      const explicitTaskId = event.type === 'task_created' ? event.taskId : event.taskId
      setSessions((current) => {
        const taskId = explicitTaskId ?? task?.id
        if (!taskId) return current
        const next = applyAgentEvent(current[taskId], event, taskId)
        return next ? { ...current, [taskId]: next } : current
      })
    })
  }, [task?.id])

  if (!task) {
    return (
      <section className="flex h-full min-h-[28rem] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/70 p-6 text-center dark:border-white/[0.08] dark:bg-gray-900/70" aria-labelledby="agent-workspace-title">
        <div>
          <h2 id="agent-workspace-title" className="text-base font-semibold text-gray-900 dark:text-gray-100">工作区</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500 dark:text-gray-400">
            输入提示词开始对话式生图，或从右侧模板选择一个起点。生成历史与画廊共享。
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="h-full min-h-0 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-gray-900" aria-labelledby="agent-workspace-title">
      <h2 id="agent-workspace-title" className="sr-only">当前任务工作区</h2>
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl bg-blue-500 px-4 py-3 text-sm leading-6 text-white shadow-sm">
            {activeSession?.prompt || task.prompt}
          </div>
        </div>

        <div className="flex justify-start">
          <div className="max-w-[86%] rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-200">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
              <span className={`h-2 w-2 rounded-full ${
                task.status === 'error' ? 'bg-red-500' :
                task.status === 'done' ? 'bg-emerald-500' :
                'bg-blue-500'
              }`} />
              <span>{activeSession?.stream ? 'Agent 流式对话' : 'Agent 对话'}</span>
            </div>
            {activeSession?.assistantText ? (
              <p className="whitespace-pre-wrap">{activeSession.assistantText}</p>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                {task.status === 'running' ? 'Agent 正在理解需求并准备调用图像工具。' : 'Agent 已完成本次图像工具调用。'}
              </p>
            )}
            {(activeSession?.toolMessage || task.status === 'running') && (
              <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                {activeSession?.toolMessage || '正在调用 image_generation 工具'}
              </div>
            )}
            {activeSession?.revisedPrompts.length ? (
              <div className="mt-3 space-y-1 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                <div className="font-medium">工具实际使用的提示词</div>
                {activeSession.revisedPrompts.map((prompt, index) => (
                  <p key={`${prompt}-${index}`} className="whitespace-pre-wrap">{prompt}</p>
                ))}
              </div>
            ) : null}
            {activeSession?.partialImages.length ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {activeSession.partialImages.slice(-4).map((image, index) => (
                  <img key={`${image.slice(0, 32)}-${index}`} src={image} alt="Agent 流式预览" className="rounded-xl border border-gray-200 dark:border-white/[0.08]" />
                ))}
              </div>
            ) : null}
            {(activeSession?.error || task.error) && (
              <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                {activeSession?.error || task.error}
              </div>
            )}
          </div>
        </div>

        {task.outputImages.length > 0 && (
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 dark:border-white/[0.08] dark:bg-gray-950">
            <TaskDetailContent task={task} presentation="workspace" />
          </div>
        )}
      </div>
    </section>
  )
}
