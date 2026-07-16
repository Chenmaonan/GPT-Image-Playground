import { useEffect, useState } from 'react'
import { initStore } from './store'
import { useStore } from './store'
import { buildSettingsFromUrlParams, clearUrlSettingParams, hasUrlSettingParams } from './lib/urlSettings'
import { useDockerApiUrlMigrationNotice } from './hooks/useDockerApiUrlMigrationNotice'
import Header from './components/Header'
import SearchBar from './components/SearchBar'
import TaskGrid from './components/TaskGrid'
import AgentWorkspace from './components/AgentWorkspace'
import InputBar from './components/InputBar'
import DetailModal from './components/DetailModal'
import Lightbox from './components/Lightbox'
import SettingsModal from './components/SettingsModal'
import ConfirmDialog from './components/ConfirmDialog'
import Toast from './components/Toast'
import MaskEditorModal from './components/MaskEditorModal'
import ImageContextMenu from './components/ImageContextMenu'

export default function App() {
  const setSettings = useStore((s) => s.setSettings)
  const [workspaceMode, setWorkspaceMode] = useState<'gallery' | 'agent'>('gallery')
  const [activeAgentTaskId, setActiveAgentTaskId] = useState<string | null>(null)
  useDockerApiUrlMigrationNotice()

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const nextSettings = buildSettingsFromUrlParams(useStore.getState().settings, searchParams)

    setSettings(nextSettings)

    if (hasUrlSettingParams(searchParams)) {
      clearUrlSettingParams(searchParams)

      const nextSearch = searchParams.toString()
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`
      window.history.replaceState(null, '', nextUrl)
    }

    initStore()
  }, [setSettings])

  useEffect(() => {
    const preventPageImageDrag = (e: DragEvent) => {
      if ((e.target as HTMLElement | null)?.closest('img')) {
        e.preventDefault()
      }
    }

    document.addEventListener('dragstart', preventPageImageDrag)
    return () => document.removeEventListener('dragstart', preventPageImageDrag)
  }, [])

  return (
    <>
      <Header />
      <main data-home-main data-drag-select-surface className={workspaceMode === 'agent' ? 'pb-8' : 'pb-48'}>
        <div className="safe-area-x max-w-7xl mx-auto">
          <div data-no-drag-select className="mt-6 flex justify-center">
            <div className="inline-flex rounded-2xl border border-gray-200 bg-white p-1 shadow-sm dark:border-white/[0.08] dark:bg-gray-900" role="tablist" aria-label="工作区模式">
              <button
                type="button"
                role="tab"
                aria-selected={workspaceMode === 'gallery'}
                className={`rounded-xl px-4 py-2 text-sm transition ${
                  workspaceMode === 'gallery'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.06]'
                }`}
                onClick={() => setWorkspaceMode('gallery')}
              >
                画廊
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={workspaceMode === 'agent'}
                className={`rounded-xl px-4 py-2 text-sm transition ${
                  workspaceMode === 'agent'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.06]'
                }`}
                onClick={() => setWorkspaceMode('agent')}
              >
                Agent
              </button>
            </div>
          </div>
          {workspaceMode === 'gallery' ? (
            <>
              <SearchBar />
              <TaskGrid />
            </>
          ) : (
            <div className="mt-4">
              <AgentWorkspace
                activeTaskId={activeAgentTaskId}
                onActiveTaskChange={setActiveAgentTaskId}
              />
            </div>
          )}
        </div>
      </main>
      <InputBar
        layout={workspaceMode === 'agent' ? 'agent' : 'default'}
        onTaskSubmitted={workspaceMode === 'agent' ? setActiveAgentTaskId : undefined}
      />
      <DetailModal />
      <Lightbox />
      <SettingsModal />
      <ConfirmDialog />
      <Toast />
      <MaskEditorModal />
      <ImageContextMenu />
    </>
  )
}
