import { describe, expect, it } from 'vitest'
import { DEFAULT_RESPONSES_MODEL, DEFAULT_SETTINGS, normalizeSettings } from '../lib/apiProfiles'
import { applyServerManagedSelectionToDraft } from './SettingsModal'

describe('applyServerManagedSelectionToDraft', () => {
  it('keeps server-managed API mode selection after settings normalization', () => {
    const draft = DEFAULT_SETTINGS

    const next = normalizeSettings(applyServerManagedSelectionToDraft(draft, { apiMode: 'responses' }))

    expect(next.apiMode).toBe('responses')
    expect(next.profiles.find((profile) => profile.id === next.activeProfileId)?.apiMode).toBe('responses')
  })

  it('keeps server-managed model selection after settings normalization', () => {
    const draft = DEFAULT_SETTINGS

    const next = normalizeSettings(applyServerManagedSelectionToDraft(draft, { model: DEFAULT_RESPONSES_MODEL }))

    expect(next.model).toBe(DEFAULT_RESPONSES_MODEL)
    expect(next.profiles.find((profile) => profile.id === next.activeProfileId)?.model).toBe(DEFAULT_RESPONSES_MODEL)
  })
})
