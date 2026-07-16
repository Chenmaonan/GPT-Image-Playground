import { describe, expect, it } from 'vitest'
import { shouldUseNativeImageContextMenu } from './ImageContextMenu'

function targetWithClosest(match: boolean): EventTarget {
  return {
    closest: (selector: string) => selector === '[data-lightbox-root]' && match ? {} : null,
  } as unknown as EventTarget
}

describe('shouldUseNativeImageContextMenu', () => {
  it('allows browser native image menu inside the lightbox', () => {
    expect(shouldUseNativeImageContextMenu(targetWithClosest(true))).toBe(true)
  })

  it('keeps the app image menu outside the lightbox', () => {
    expect(shouldUseNativeImageContextMenu(targetWithClosest(false))).toBe(false)
    expect(shouldUseNativeImageContextMenu(null)).toBe(false)
  })
})
