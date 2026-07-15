import { useStore } from '../store'
import { TEMPLATE_SAMPLES } from '../data/templateSamples'
import type { TemplateSample } from '../data/templateSamples'
import TemplateCard from './TemplateCard'

const INPUT_EDITOR_SELECTOR = '[data-input-bar] [contenteditable="true"]'

export function applyTemplate(template: TemplateSample) {
  const { setPrompt, setParams, showToast } = useStore.getState()

  setPrompt(template.prompt)
  if (template.size.trim()) setParams({ size: template.size })
  showToast('已应用模板，可继续修改后生成', 'success')

  requestAnimationFrame(() => {
    const inputEditor = document.querySelector<HTMLElement>(INPUT_EDITOR_SELECTOR)
    if (!inputEditor) return

    inputEditor.focus()
    inputEditor.scrollIntoView({ block: 'nearest' })
  })
}

export default function TemplateGallery() {
  return (
    <section className="pb-48 sm:pb-52" aria-labelledby="template-gallery-title">
      <div className="mb-4">
        <h2
          id="template-gallery-title"
          className="text-lg font-semibold text-gray-900 dark:text-gray-100"
        >
          灵感模板
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          选择一个模板作为起点，应用后可继续调整提示词与尺寸。
        </p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,24rem),1fr))] gap-4">
        {TEMPLATE_SAMPLES.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onUse={applyTemplate}
          />
        ))}
      </div>
    </section>
  )
}
