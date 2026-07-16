import { useMemo, useRef } from 'react'
import { useStore } from '../store'
import { useCloseOnEscape } from '../hooks/useCloseOnEscape'
import { usePreventBackgroundScroll } from '../hooks/usePreventBackgroundScroll'
import { CloseIcon } from './icons'
import TaskDetailContent from './TaskDetailContent'

export default function DetailModal() {
  const tasks = useStore((s) => s.tasks)
  const detailTaskId = useStore((s) => s.detailTaskId)
  const setDetailTaskId = useStore((s) => s.setDetailTaskId)
  const modalRef = useRef<HTMLDivElement>(null)

  const task = useMemo(
    () => tasks.find((item) => item.id === detailTaskId) ?? null,
    [detailTaskId, tasks],
  )

  useCloseOnEscape(Boolean(task), () => setDetailTaskId(null))
  usePreventBackgroundScroll(Boolean(task), [modalRef])

  if (!task) return null

  return (
    <div
      data-no-drag-select
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={() => setDetailTaskId(null)}
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-md dark:bg-black/40" />
      <div
        ref={modalRef}
        className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/50 bg-white/90 shadow-[0_8px_40px_rgb(0,0,0,0.12)] ring-1 ring-black/5 backdrop-blur-xl dark:border-white/[0.08] dark:bg-gray-900/90 dark:shadow-[0_8px_40px_rgb(0,0,0,0.4)] dark:ring-white/10"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={() => setDetailTaskId(null)}
          className="absolute right-3 top-3 z-20 rounded-full p-1 text-gray-400 transition hover:bg-gray-100 dark:hover:bg-white/[0.06]"
          aria-label="关闭"
          type="button"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
        <TaskDetailContent
          task={task}
          presentation="modal"
          onRequestClose={() => setDetailTaskId(null)}
        />
      </div>
    </div>
  )
}
