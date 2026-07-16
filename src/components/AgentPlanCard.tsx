import type { RestrictedAgentPlan } from '../types'

interface AgentPlanCardProps {
  plan: RestrictedAgentPlan
  confirming?: boolean
  onConfirm: () => void
  onReturnToEditing: () => void
}
export default function AgentPlanCard({
  plan,
  confirming = false,
  onConfirm,
  onReturnToEditing,
}: AgentPlanCardProps) {
  const expiresAt = new Date(plan.expiresAt)
  const expired = expiresAt.getTime() <= Date.now()

  return (
    <article className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm dark:border-blue-500/25 dark:bg-gray-900" aria-labelledby="agent-plan-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-blue-500">等待确认</div>
          <h2 id="agent-plan-title" className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{plan.summary}</h2>
          <p className="mt-1 text-xs text-gray-400">计划版本 {plan.version} · {expired ? '已过期' : `有效至 ${expiresAt.toLocaleTimeString()}`}</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
          {plan.generation.action === 'edit' ? '图片编辑' : '文本生图'}
        </span>
      </div>

      <section className="mt-5">
        <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400">执行步骤</h3>
        <ol className="mt-2 space-y-2">
          {plan.steps.map((step, index) => (
            <li key={`${step.title}-${index}`} className="flex gap-3 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-white/[0.04] dark:text-gray-200">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[11px] font-semibold text-white">{index + 1}</span>
              <span>{step.title}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-5">
        <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400">最终执行 Prompt</h3>
        <p className="mt-2 whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-700 dark:border-white/[0.08] dark:bg-gray-950 dark:text-gray-200">
          {plan.generation.exactPrompt}
        </p>
      </section>

      <section className="mt-5">
        <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400">冻结参数</h3>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
          {[
            ['尺寸', plan.generation.size],
            ['质量', plan.generation.quality],
            ['格式', plan.generation.outputFormat],
            ['压缩率', plan.generation.outputCompression ?? '不适用'],
            ['数量', plan.generation.imageCount],
            ['参考资源', plan.inputs.length],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/[0.04]">
              <dt className="text-gray-400">{label}</dt>
              <dd className="mt-1 font-medium text-gray-700 dark:text-gray-200">{String(value)}</dd>
            </div>
          ))}
        </dl>
      </section>

      {plan.assumptions.length > 0 && (
        <section className="mt-5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          <h3 className="font-medium">规划假设</h3>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {plan.assumptions.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      )}

      {plan.warnings.length > 0 && (
        <section className="mt-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
          <h3 className="font-medium">执行前提示</h3>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {plan.warnings.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4 dark:border-white/[0.08]">
        <button
          type="button"
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.1] dark:text-gray-300 dark:hover:bg-white/[0.05]"
          onClick={onReturnToEditing}
          disabled={confirming}
        >
          返回修改
        </button>
        <button
          type="button"
          className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-white/[0.08]"
          onClick={onConfirm}
          disabled={confirming || expired}
        >
          {confirming ? '正在确认…' : expired ? '计划已过期' : '确认并生成'}
        </button>
      </div>
    </article>
  )
}
