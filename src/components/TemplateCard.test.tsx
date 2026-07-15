import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import TemplateCard from './TemplateCard'
import type { TemplateSample } from '../data/templateSamples'

const template: TemplateSample = {
  id: 'template-013',
  sourceSampleId: 'task-013',
  title: '旅行租赁小程序头图',
  category: '营销视觉',
  prompt: '以参考图为基础，制作适合旅行租赁小程序的横幅头图。',
  imageSrc: './templates/task-013.webp',
  ratio: '16:9',
  size: '1536x1024',
  requiresReference: true,
  alt: '旅行租赁小程序头图模板预览',
}

describe('TemplateCard', () => {
  it('renders template details, accessible image and the only available action', () => {
    const markup = renderToStaticMarkup(
      <TemplateCard template={template} onUse={vi.fn()} />,
    )

    expect(markup).toContain(template.title)
    expect(markup).toContain(template.prompt)
    expect(markup).toContain(template.category)
    expect(markup).toContain(template.ratio)
    expect(markup).toContain(template.size)
    expect(markup).toContain('需参考图')
    expect(markup).toContain('loading="lazy"')
    expect(markup).toContain(`alt="${template.alt}"`)
    expect(markup).toContain('aria-label="使用模板：旅行租赁小程序头图"')
    expect(markup).toContain('title="使用模板"')
    expect(markup).toContain('使用模板')

    expect(markup).not.toContain('收藏')
    expect(markup).not.toContain('删除')
    expect(markup).not.toContain('编辑输出')
    expect(markup).not.toContain('重试')
    expect(markup).not.toContain('checkbox')
  })

  it('hides the reference requirement for text-only templates', () => {
    const markup = renderToStaticMarkup(
      <TemplateCard
        template={{ ...template, requiresReference: false }}
        onUse={vi.fn()}
      />,
    )

    expect(markup).not.toContain('需参考图')
  })
})
