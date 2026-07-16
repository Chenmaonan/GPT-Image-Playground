import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const runtimeConfigMock = vi.hoisted(() => ({ enabled: false, agentOnly: false }))

vi.mock('./store', () => {
  const state = { setSettings: vi.fn() }
  return {
    initStore: vi.fn(),
    useStore: (selector: (value: typeof state) => unknown) => selector(state),
  }
})

vi.mock('./lib/urlSettings', () => ({
  buildSettingsFromUrlParams: vi.fn(),
  clearUrlSettingParams: vi.fn(),
  hasUrlSettingParams: vi.fn(() => false),
}))
vi.mock('./hooks/useDockerApiUrlMigrationNotice', () => ({
  useDockerApiUrlMigrationNotice: vi.fn(),
}))
vi.mock('./restrictedAgentStore', () => ({
  useRestrictedAgentStore: <T,>(selector: (value: { recover: () => Promise<void> }) => T) => selector({ recover: vi.fn(async () => undefined) }),
}))
vi.mock('./lib/serverApiConfig', () => ({
  isRestrictedAgentEnabled: () => runtimeConfigMock.enabled,
  isRestrictedAgentOnly: () => runtimeConfigMock.agentOnly,
}))

vi.mock('./components/Header', () => ({ default: () => <div data-component="header" /> }))
vi.mock('./components/TemplateGallery', () => ({ default: () => <div data-component="template-gallery" /> }))
vi.mock('./components/SearchBar', () => ({ default: () => <div data-component="search-bar" /> }))
vi.mock('./components/TaskGrid', () => ({ default: () => <div data-component="task-grid" /> }))
vi.mock('./components/AgentWorkspace', () => ({ default: () => <div data-component="agent-workspace" /> }))
vi.mock('./components/InputBar', () => ({ default: () => <div data-component="input-bar" /> }))
vi.mock('./components/DetailModal', () => ({ default: () => <div data-component="detail-modal" /> }))
vi.mock('./components/Lightbox', () => ({ default: () => <div data-component="lightbox" /> }))
vi.mock('./components/SettingsModal', () => ({ default: () => <div data-component="settings-modal" /> }))
vi.mock('./components/ConfirmDialog', () => ({ default: () => <div data-component="confirm-dialog" /> }))
vi.mock('./components/Toast', () => ({ default: () => <div data-component="toast" /> }))
vi.mock('./components/MaskEditorModal', () => ({ default: () => <div data-component="mask-editor" /> }))
vi.mock('./components/ImageContextMenu', () => ({ default: () => <div data-component="image-context-menu" /> }))

import App from './App'

describe('App gallery home', () => {
  it('defaults to gallery mode and hides templates from gallery', () => {
    runtimeConfigMock.enabled = false
    runtimeConfigMock.agentOnly = false
    const markup = renderToStaticMarkup(<App />)
    const templateIndex = markup.indexOf('data-component="template-gallery"')
    const searchIndex = markup.indexOf('data-component="search-bar"')
    const taskGridIndex = markup.indexOf('data-component="task-grid"')

    expect(templateIndex).toBe(-1)
    expect(searchIndex).toBeGreaterThan(-1)
    expect(taskGridIndex).toBeGreaterThan(searchIndex)
    expect(markup).toContain('data-component="input-bar"')
    expect(markup).not.toContain('role="tablist"')
    expect(markup).not.toContain('>Agent<')
    expect(markup).not.toContain('data-component="agent-workspace"')
  })

  it('opens the Agent workspace directly in agent-only mode', () => {
    runtimeConfigMock.enabled = true
    runtimeConfigMock.agentOnly = true

    const markup = renderToStaticMarkup(<App />)

    expect(markup).toContain('data-component="agent-workspace"')
    expect(markup).not.toContain('data-component="task-grid"')
    expect(markup).not.toContain('role="tablist"')
  })
})
