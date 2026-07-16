import { useState } from 'react'
import type { TemplateSample } from '../data/templateSamples'

interface TemplateCardProps {
  template: TemplateSample
  onUse: (template: TemplateSample) => void
  variant?: 'default' | 'rail'
}

export default function TemplateCard({ template, onUse, variant = 'default' }: TemplateCardProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const imageAlt = template.alt.trim() || `${template.title}模板预览`
  const isRail = variant === 'rail'

  return (
    <article className={`${isRail ? 'overflow-hidden' : 'h-40 overflow-hidden'} rounded-xl border border-gray-200 bg-white transition-[box-shadow,border-color,background-color] duration-200 hover:border-gray-300 hover:shadow-lg dark:border-white/[0.08] dark:bg-gray-900 dark:hover:border-white/[0.18] dark:hover:bg-gray-800/80`}>
      <div className={isRail ? 'flex flex-col' : 'flex h-full'}>
        <div className={`relative flex flex-shrink-0 items-center justify-center overflow-hidden bg-gray-100 dark:bg-black/20 ${
          isRail ? 'aspect-[4/3] w-full' : 'h-full w-40 min-w-[10rem]'
        }`}>
          {imageFailed ? (
            <svg
              aria-hidden="true"
              className="h-8 w-8 text-gray-300 dark:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2 1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
              />
            </svg>
          ) : (
            <img
              alt={imageAlt}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={() => setImageFailed(true)}
              src={template.imageSrc}
            />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col p-3">
          <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {template.title}
          </h3>
          <p className={`${isRail ? 'line-clamp-2' : 'line-clamp-2 min-h-0 flex-1'} mt-1 overflow-hidden text-sm leading-relaxed text-gray-600 dark:text-gray-300`}>
            {template.prompt}
          </p>

          <div className="mt-1.5 flex min-w-0 gap-1.5 overflow-x-auto whitespace-nowrap pt-0.5 hide-scrollbar mask-edge-r">
            {!isRail && (
              <span className="flex-shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-white/[0.04] dark:text-gray-300">
                {template.category}
              </span>
            )}
            <span className="flex-shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-white/[0.04] dark:text-gray-300">
              {template.ratio}
            </span>
            <span className="flex-shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-white/[0.04] dark:text-gray-300">
              {template.size}
            </span>
            {template.requiresReference && (
              <span className="flex-shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                需参考图
              </span>
            )}
          </div>

          <div className="mt-1.5 flex flex-shrink-0 justify-end">
            <button
              aria-label={`使用模板：${template.title}`}
              className="flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition hover:bg-blue-50 hover:text-blue-500 dark:text-gray-400 dark:hover:bg-blue-950/30 dark:hover:text-blue-400"
              onClick={() => onUse(template)}
              title="使用模板"
              type="button"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6 6-6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
              使用模板
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
