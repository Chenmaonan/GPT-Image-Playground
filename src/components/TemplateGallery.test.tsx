import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const templates = Array.from({ length: 6 }, (_, index) => ({
  id: `template-${index + 1}`,
  sourceSampleId: `task-${index + 1}`,
  title: `模板 ${index + 1}`,
  category: '测试分类',
  prompt: `测试提示词 ${index + 1}`,
  imageSrc: `./templates/task-${index + 1}.webp`,
  ratio: '1:1',
  size: '1024x1024',
  requiresReference: false,
  alt: `模板 ${index + 1} 预览`,
}))

afterEach(() => {
  vi.doUnmock('../store')
  vi.doUnmock('../data/templateSamples')
  vi.doUnmock('./TemplateCard')
  vi.unstubAllGlobals()
  vi.resetModules()
})

function mockDependencies() {
  const params = { size: 'auto', quality: 'high', n: 2 }
  const setPrompt = vi.fn()
  const setParams = vi.fn((patch: Partial<typeof params>) => Object.assign(params, patch))
  const showToast = vi.fn()
  const submitTask = vi.fn()
  const storeState = { setPrompt, setParams, showToast }
  const onUseCallbacks: Array<(template: (typeof templates)[number]) => void> = []

  vi.doMock('../store', () => ({
    useStore: { getState: () => storeState },
    submitTask,
  }))
  vi.doMock('../data/templateSamples', () => ({ TEMPLATE_SAMPLES: templates }))
  vi.doMock('./TemplateCard', () => ({
    default: ({
      template,
      onUse,
    }: {
      template: (typeof templates)[number]
      onUse: (template: (typeof templates)[number]) => void
    }) => {
      onUseCallbacks.push(onUse)
      return <article data-template-id={template.id}>{template.title}</article>
    },
  }))
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))

  return { params, setPrompt, setParams, showToast, submitTask, onUseCallbacks }
}

describe('TemplateGallery', () => {
  it('renders the heading, subtitle and six templates in a responsive grid', async () => {
    const { onUseCallbacks } = mockDependencies()
    const { default: TemplateGallery, applyTemplate } = await import('./TemplateGallery')

    const markup = renderToStaticMarkup(<TemplateGallery />)

    expect(markup).toContain('灵感模板')
    expect(markup).toContain('选择一个模板作为起点')
    expect(markup).toContain('grid-cols-[repeat(auto-fit,minmax(min(100%,24rem),1fr))]')
    expect(markup.match(/data-template-id=/g)).toHaveLength(6)
    expect(onUseCallbacks).toHaveLength(6)
    expect(onUseCallbacks.every((onUse) => onUse === applyTemplate)).toBe(true)
  })

  it('applies only the prompt and size without submitting a task', async () => {
    const { params, setPrompt, setParams, showToast, submitTask } = mockDependencies()
    const { applyTemplate } = await import('./TemplateGallery')

    applyTemplate(templates[0])

    expect(setPrompt).toHaveBeenCalledWith(templates[0].prompt)
    expect(setParams).toHaveBeenCalledWith({ size: templates[0].size })
    expect(params).toEqual({ size: templates[0].size, quality: 'high', n: 2 })
    expect(showToast).toHaveBeenCalledWith('已应用模板，可继续修改后生成', 'success')
    expect(submitTask).not.toHaveBeenCalled()
  })

  it('does not replace the current size when the template size is empty', async () => {
    const { params, setParams } = mockDependencies()
    const { applyTemplate } = await import('./TemplateGallery')

    applyTemplate({ ...templates[0], size: '   ' })

    expect(setParams).not.toHaveBeenCalled()
    expect(params.size).toBe('auto')
  })

  it('focuses and scrolls the input editor on the next animation frame', async () => {
    mockDependencies()
    const focus = vi.fn()
    const scrollIntoView = vi.fn()
    const querySelector = vi.fn(() => ({ focus, scrollIntoView }))
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    vi.stubGlobal('document', { querySelector })
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrame)
    const { applyTemplate } = await import('./TemplateGallery')

    applyTemplate(templates[0])

    expect(requestAnimationFrame).toHaveBeenCalledOnce()
    expect(querySelector).toHaveBeenCalledWith('[data-input-bar] [contenteditable="true"]')
    expect(focus).toHaveBeenCalledOnce()
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
  })

  it('silently skips focusing when the input editor is unavailable', async () => {
    mockDependencies()
    vi.stubGlobal('document', { querySelector: vi.fn(() => null) })
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    const { applyTemplate } = await import('./TemplateGallery')

    expect(() => applyTemplate(templates[0])).not.toThrow()
  })
})
