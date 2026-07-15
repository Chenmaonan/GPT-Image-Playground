# 工作台模板展示实施计划

> **执行要求：** 按任务顺序实施；适合并行的独立文件由 Ultra 子代理处理，主代理负责 `AgentWorkspace` 接入、结果整合和最终验证。

**目标：** 在 Agent 工作台展示 6 个精选模板，卡片沿用历史生成记录卡片视觉，点击后填充 Prompt 与尺寸，不自动生成。

**架构：** 使用独立静态模板数据和 `TemplateGallery -> TemplateCard` 组件链。模板资源放在 `public/templates/`，模板行为只调用现有 Zustand `setPrompt`、`setParams` 和 `showToast`，不进入任务 Store 或 IndexedDB。

**技术栈：** React 19、TypeScript 5.8、Zustand 5、Vite 6、Tailwind CSS 3、Vitest 4。

## 全局约束

- 不修改或覆盖用户现有的 `src/App.tsx` 工作树改动。
- 不修改 `TaskRecord`、IndexedDB schema、路由、历史筛选和部署配置。
- 不新增依赖，不联网，不删除文件，不部署、不发布、不推送。
- 只复制 6 张已批准的 WebP，不把 43 张完整样例库打入生产资源。
- 生成或视觉验证产生的临时文件必须在结束前清理。

---

### 任务 1：建立精选模板数据与静态资源

**文件：**

- 新增：`src/data/templateSamples.ts`
- 新增：`src/data/templateSamples.test.ts`
- 复制：`public/templates/task-004.webp`
- 复制：`public/templates/task-013.webp`
- 复制：`public/templates/task-005.webp`
- 复制：`public/templates/task-006.webp`
- 复制：`public/templates/task-007.webp`
- 复制：`public/templates/task-024.webp`

**来源：**

- `image-sample-library/gpt-image-playground-20260715-excellent/task-*/image-001.webp`
- 对应 `meta.json` 和 `prompt.txt`

- [ ] **步骤 1：先写数据约束测试**

测试至少覆盖：

```ts
expect(TEMPLATE_SAMPLES).toHaveLength(6)
expect(new Set(TEMPLATE_SAMPLES.map((sample) => sample.id)).size).toBe(6)
expect(TEMPLATE_SAMPLES.every((sample) => sample.prompt.trim())).toBe(true)
expect(TEMPLATE_SAMPLES.every((sample) => sample.imageSrc.startsWith(import.meta.env.BASE_URL))).toBe(true)
expect(TEMPLATE_SAMPLES.filter((sample) => sample.requiresReference)).toHaveLength(5)
```

- [ ] **步骤 2：运行定向测试并确认因模块缺失而失败**

执行：`npm test -- src/data/templateSamples.test.ts`

预期：FAIL，原因是模板数据模块尚未实现。

- [ ] **步骤 3：复制 6 张资源并实现数据模块**

数据类型：

```ts
export interface TemplateSample {
  id: string
  sourceSampleId: string
  title: string
  category: string
  prompt: string
  imageSrc: string
  ratio: string
  size: string
  requiresReference: boolean
  alt: string
}
```

图片 URL 使用：

```ts
const templateImageUrl = (fileName: string) => `${import.meta.env.BASE_URL}templates/${fileName}`
```

- [ ] **步骤 4：核对复制结果与来源哈希**

使用 `Get-FileHash` 比较 6 对源文件和目标文件，预期每对 SHA256 相同。

- [ ] **步骤 5：运行数据测试**

执行：`npm test -- src/data/templateSamples.test.ts`

预期：PASS。

### 任务 2：实现纯展示模板卡片

**文件：**

- 新增：`src/components/TemplateCard.tsx`
- 新增：`src/components/TemplateCard.test.tsx`

**组件接口：**

```ts
interface TemplateCardProps {
  template: TemplateSample
  onUse: (template: TemplateSample) => void
}
```

- [ ] **步骤 1：先写静态渲染测试**

使用 `renderToStaticMarkup` 验证：

- 标题、Prompt、类别、比例和尺寸可见。
- 图片包含 `loading="lazy"` 和非空 `alt`。
- 依赖参考图时显示“需参考图”。
- “使用模板”按钮存在且有 `aria-label`。
- 不出现收藏、删除、编辑输出、重试和选择控件。

- [ ] **步骤 2：运行测试并确认失败**

执行：`npm test -- src/components/TemplateCard.test.tsx`

预期：FAIL，原因是组件尚未实现。

- [ ] **步骤 3：实现卡片视觉与图片失败占位**

保持与 `TaskCard` 一致的主要视觉值：

- `rounded-xl`、浅色/深色边框、白色/深色背景、hover 阴影。
- 横向 `h-40` 布局和左侧 `w-40` 图片区。
- Prompt 两行截断，标签横向滚动或换行不撑高卡片。
- 操作区只显示复用图标和“使用模板”。
- 使用 `onError` 切换到图片占位状态，不能影响文字和按钮。

- [ ] **步骤 4：运行卡片测试**

执行：`npm test -- src/components/TemplateCard.test.tsx`

预期：PASS。

### 任务 3：实现模板列表与使用模板行为

**文件：**

- 新增：`src/components/TemplateGallery.tsx`
- 新增：`src/components/TemplateGallery.test.tsx`

**数据流：**

```text
TemplateCard.onUse
  -> useStore.getState().setPrompt(template.prompt)
  -> useStore.getState().setParams({ size: template.size })
  -> useStore.getState().showToast(...)
  -> 聚焦底部 contentEditable 输入区
```

- [ ] **步骤 1：先写 Store 行为与静态结构测试**

将模板应用逻辑导出为纯函数：

```ts
export function applyTemplate(template: TemplateSample) {
  const { setPrompt, setParams, showToast } = useStore.getState()
  setPrompt(template.prompt)
  if (template.size.trim()) setParams({ size: template.size })
  showToast('已应用模板，可继续修改后生成', 'success')
}
```

测试验证：

- Prompt 被覆盖为模板内容。
- 尺寸被覆盖，其他参数保持不变。
- 不新增任务，不调用 `submitTask`。
- 模板区渲染 6 张卡片和标题。

- [ ] **步骤 2：运行测试并确认失败**

执行：`npm test -- src/components/TemplateGallery.test.tsx`

预期：FAIL，原因是列表组件和行为函数尚未实现。

- [ ] **步骤 3：实现列表、响应式网格和输入聚焦**

网格使用单列、`sm` 双列、宽屏三列。应用模板后用 `requestAnimationFrame` 查找 `[data-input-bar] [contenteditable="true"]`，调用 `focus()` 和 `scrollIntoView({ block: 'nearest' })`；找不到输入元素时静默跳过，不影响 Store 更新。

- [ ] **步骤 4：运行列表测试**

执行：`npm test -- src/components/TemplateGallery.test.tsx`

预期：PASS。

### 任务 4：接入 Agent 工作台

**文件：**

- 修改：`src/components/AgentWorkspace.tsx`
- 新增：`src/components/AgentWorkspace.test.tsx`

- [ ] **步骤 1：先写工作台结构测试**

使用 Store mock 和 `renderToStaticMarkup` 验证：

- 顶部模式插槽仍存在。
- 完成、运行、异常统计保持正确。
- 原“Agent 模式”占位说明被模板标题和 6 张模板卡替换。
- 模板区在有历史任务和无历史任务时都渲染。

- [ ] **步骤 2：运行测试并确认失败**

执行：`npm test -- src/components/AgentWorkspace.test.tsx`

预期：FAIL，原因是工作台尚未挂载模板列表。

- [ ] **步骤 3：替换占位区并保留布局边界**

只修改 `AgentWorkspace.tsx`：

- 保留模式切换和统计。
- 主区域从垂直居中占位改为顶部对齐的模板区。
- 保留 `pb-56`，避免固定输入栏遮挡。
- 不修改 `App.tsx`、`HistorySidebar` 或 `InputBar`。

- [ ] **步骤 4：运行工作台测试**

执行：`npm test -- src/components/AgentWorkspace.test.tsx`

预期：PASS。

### 任务 5：全量验证、视觉检查和完成审计

**测试范围：**

- 新增的模板数据和组件测试。
- 全部现有 Vitest 测试。
- TypeScript 和 Vite 生产构建。
- 桌面、平板、移动端的浅色/深色视觉检查。

- [ ] **步骤 1：运行模板相关定向测试**

执行：

```powershell
npm test -- src/data/templateSamples.test.ts src/components/TemplateCard.test.tsx src/components/TemplateGallery.test.tsx src/components/AgentWorkspace.test.tsx
```

预期：全部 PASS。

- [ ] **步骤 2：运行全量测试和生产构建**

执行：

```powershell
npm test
npm run build
```

预期：退出码均为 0；`dist/templates/` 包含 6 张 WebP。

- [ ] **步骤 3：启动开发服务器并进行浏览器验证**

在空闲端口启动 `npm run dev -- --host 127.0.0.1`，检查：

- `1440x900`、`1024x768`、`390x844`。
- 浅色和深色模式。
- 3/2/1 列布局、长 Prompt 截断、宽图裁切、图片加载失败占位。
- 最后一行卡片不被固定输入栏遮挡。
- 点击“使用模板”后 Prompt 和尺寸写入，不产生历史任务或网络生成请求。
- 控制台无 React 错误、图片 404 或布局溢出。

- [ ] **步骤 4：清理验证产物并复查工作树**

停止开发服务器；移除截图、日志、临时脚本等中间产物。执行：

```powershell
git diff --check
git status --short
```

预期：只保留本任务业务改动、实施计划，以及用户原有 `src/App.tsx` 修改和未跟踪样例库；没有测试临时文件。

- [ ] **步骤 5：按需求逐项完成审计**

核对证据：

- “工作台内添加模板展示”由 `AgentWorkspace` 实际渲染和浏览器截图证明。
- “从优秀样例库选取内容”由数据源 ID、Prompt、复制资源哈希证明。
- “卡片沿用历史记录样式”由组件 class 对照和桌面/移动视觉检查证明。
- “使用 Ultra 多智能体工作流”由独立子任务结果、主代理交叉验证和最终集成记录证明。

- [ ] **步骤 6：询问 Docker 测试与 Git 提交**

项目存在完整 Docker 部署痕迹。常规验证完成后询问是否执行 Docker 测试部署；未获确认不执行。随后列出本次改动并询问是否提交，建议提交信息：`feat: 增加工作台模板展示`。

## 回滚

移除 `TemplateGallery`、`TemplateCard`、模板数据、对应测试、6 张静态图片，并恢复 `AgentWorkspace` 的原占位内容。没有 Store schema、用户数据或路由迁移，不需要额外恢复步骤。
