import { TEMPLATE_SAMPLES } from '../data/templateSamples'
import TemplateCard from './TemplateCard'
import { applyTemplate } from './TemplateGallery'

interface AgentTemplateRailProps {
  onTemplateApplied?: () => void
}

export default function AgentTemplateRail({ onTemplateApplied }: AgentTemplateRailProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col" aria-labelledby="agent-template-title">
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50/95 p-4 backdrop-blur dark:border-white/[0.08] dark:bg-gray-950/95">
        <h2 id="agent-template-title" className="text-sm font-semibold text-gray-900 dark:text-gray-100">灵感模板</h2>
        <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">模板只填充提示词和尺寸，不会自动提交。</p>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {TEMPLATE_SAMPLES.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            variant="rail"
            onUse={(item) => {
              applyTemplate(item)
              onTemplateApplied?.()
            }}
          />
        ))}
      </div>
    </aside>
  )
}
