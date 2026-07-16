import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { TemplateSample } from '../data/templateSamples'

const mockState = vi.hoisted(() => {
  const template: TemplateSample = {
    id: 'template-a',
    sourceSampleId: 'task-a',
    title: '模板 A',
    category: '测试',
    prompt: '模板提示词',
    imageSrc: './template.webp',
    ratio: '1:1',
    size: '1024x1024',
    requiresReference: false,
    alt: '模板预览',
  }
  return {
    template,
    setPrompt: vi.fn(),
    setParams: vi.fn(),
    showToast: vi.fn(),
    submitTask: vi.fn(),
    capturedCards: [] as Array<{
      variant?: string
      template: TemplateSample
      onUse: (template: TemplateSample) => void
    }>,
  }
})

vi.mock('../store', () => ({
  useStore: {
    getState: () => ({ setPrompt: mockState.setPrompt, setParams: mockState.setParams, showToast: mockState.showToast }),
  },
  submitTask: mockState.submitTask,
}))
vi.mock('../data/templateSamples', () => ({ TEMPLATE_SAMPLES: [mockState.template] }))
vi.mock('./TemplateCard', () => ({
  default: (props: {
    variant?: string
    template: TemplateSample
    onUse: (template: TemplateSample) => void
  }) => {
    mockState.capturedCards.push(props)
    return <article data-template-id={props.template.id}>{props.template.title}</article>
  },
}))

import AgentTemplateRail from './AgentTemplateRail'

afterEach(() => {
  mockState.capturedCards.length = 0
  mockState.setPrompt.mockClear()
  mockState.setParams.mockClear()
  mockState.showToast.mockClear()
  mockState.submitTask.mockClear()
  vi.unstubAllGlobals()
})

describe('AgentTemplateRail', () => {
  it('uses rail cards and applies templates without submitting', () => {
    const onTemplateApplied = vi.fn()
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))

    const markup = renderToStaticMarkup(<AgentTemplateRail onTemplateApplied={onTemplateApplied} />)

    expect(markup).toContain('灵感模板')
    expect(mockState.capturedCards).toHaveLength(1)
    expect(mockState.capturedCards[0].variant).toBe('rail')

    mockState.capturedCards[0].onUse(mockState.template)

    expect(mockState.setPrompt).toHaveBeenCalledWith(mockState.template.prompt)
    expect(mockState.setParams).toHaveBeenCalledWith({ size: mockState.template.size })
    expect(mockState.showToast).toHaveBeenCalledWith('已应用模板，可继续修改后生成', 'success')
    expect(mockState.submitTask).not.toHaveBeenCalled()
    expect(onTemplateApplied).toHaveBeenCalledOnce()
  })
})
