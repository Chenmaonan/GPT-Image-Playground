# Agent 三栏工作台设计

## 背景

当前首页只有画廊模式：模板展示位于任务搜索和任务网格之前，任务卡通过 `TaskGrid -> TaskCard` 提供收藏、复用、编辑输出、删除、重试和详情等操作。此前新增的 Agent 页面已经回退，仓库中不存在可复用的 Agent 工作台页面或真正的受限 Agent 执行链。

本设计在不改变任务数据结构和现有画廊行为的前提下，重新增加 Agent 工作台。桌面端采用“左历史、中工作区、右模板”三栏；窄屏采用顶部分段切换。模板只在 Agent 模式出现，生成历史由画廊和 Agent 共享。

## 目标

- 刷新后默认进入画廊模式，用户可切换到 Agent 模式。
- Agent 桌面端左侧展示生成历史，中间展示当前任务详情和生成结果，右侧展示模板列表。
- 模板作为辅助入口，不占据页面视觉中心。
- Agent 历史卡保留现有任务卡的收藏、复用、编辑输出、删除、重试和查看详情能力。
- 画廊和 Agent 共享全部 `TaskRecord`、搜索条件、筛选状态和 IndexedDB 历史。
- 中间工作区直接展示任务详情，不再通过模态框查看。
- 预留可替换的 Agent Executor 边界，但本次不实现真正的 Agent 推理和工具调度。

## 非目标

- 不实现飞书机器人、服务端任务队列或远程历史同步。
- 不实现真正的受限 Agent、提示词规划、工具选择或多步执行。
- 不新增任务来源字段，不区分画廊任务和 Agent 任务。
- 不修改 IndexedDB schema，不迁移现有历史数据。
- 不重做图片生成 Provider、API Profile 或服务端统一 API 配置。
- 不新增模板后台、模板搜索、模板分页或用户自定义模板。

## 已确认的产品决策

1. 默认模式为画廊，模式状态不持久化。
2. 模板只在 Agent 模式右栏出现，画廊恢复为搜索栏和任务网格。
3. Agent 桌面端使用左历史、中工作区、右模板三栏。
4. 小于 `1280px` 时使用“历史 / 工作区 / 模板”顶部分段切换，默认打开工作区。
5. 点击历史任务后，移动端自动切换到工作区并展示该任务。
6. 点击模板后填充提示词和尺寸，移动端自动切换到工作区并聚焦输入框。
7. Agent 和画廊展示同一份全部任务历史。
8. 现有任务行为通过共享组件变体实现，不复制一套 Agent 专用业务逻辑。
9. 本次只实现工作台 UI 和执行接口预留，真正的受限 Agent 作为独立后续设计。

## 页面结构

```text
App
├─ Header
├─ WorkspaceModeTabs
├─ 画廊模式
│  ├─ SearchBar
│  └─ TaskGrid
├─ Agent 模式
│  └─ AgentWorkspace
│     ├─ AgentHistoryPanel
│     ├─ AgentMainWorkspace
│     └─ AgentTemplateRail
└─ InputBar
```

`WorkspaceModeTabs` 位于 Header 下方的页面工具栏中，在画廊和 Agent 模式均可见。切换模式只改变布局，不清空提示词、参考图、参数、筛选条件或当前任务历史。

## 桌面布局

视口宽度 `>=1280px` 时，Agent 使用固定辅助栏和弹性主栏：

```text
┌────────────────┬──────────────────────────┬──────────────┐
│ 历史记录       │ 当前任务 / 生成结果      │ 灵感模板     │
│ 360–420px      │ min 520px / 自动扩展     │ 300–340px    │
│                │                          │              │
│ compact cards  │ shared task detail       │ rail cards   │
└────────────────┴──────────────────────────┴──────────────┘
                  中栏底部固定 InputBar
```

- Agent 主容器使用视口高度布局，避免整个页面随历史长度无限增长。
- 三栏分别设置 `overflow-y: auto`，栏头使用 sticky。
- 左栏宽度允许紧凑任务卡完整显示图片、摘要和操作按钮。
- 中栏获得剩余宽度，视觉焦点始终是当前任务图片和状态。
- 右栏保持窄宽，只展示纵向模板列表。
- `InputBar` 在 Agent 桌面端只对齐中栏，并为中栏内容预留底部安全间距。

## 窄屏布局

视口宽度 `<1280px` 时不压缩三栏，改用顶部分段导航：

```text
历史 | 工作区 | 模板
```

- 初次进入 Agent 模式时默认选择“工作区”。
- 每个分段独占可用宽度，避免窄栏卡片继续缩小。
- 点击历史任务后设置当前任务，并自动切换到“工作区”。
- 点击“使用模板”后更新输入，自动切换到“工作区”并聚焦输入框。
- `InputBar` 继续固定在视口底部。
- 分段选择仅属于当前页面会话，不写入持久化 Store。

## 组件设计

### `AgentWorkspace`

负责组合三栏或分段布局，并维护纯 UI 状态：

- `activeAgentTaskId`
- `mobileAgentPanel: 'history' | 'workspace' | 'templates'`

默认任务选择规则：

1. 新任务创建时优先选择新任务。
2. 没有显式选择时选择最新任务。
3. 当前任务删除后选择列表中的相邻任务。
4. 没有任务时进入空状态。

### `AgentHistoryPanel`

负责：

- 展示 `SearchBar` 或等价的紧凑筛选头。
- 使用与画廊相同的搜索、状态和收藏筛选字段。
- 按 `createdAt` 降序显示全部任务。
- 渲染 `TaskCard variant="compact"`。
- 将任务点击转换为 Agent 中间区选择，不设置 `detailTaskId`，因此不打开模态框。

任务排序和筛选从 `TaskGrid` 中提取为纯函数或共享 Hook，避免两处规则漂移。

### `TaskCard`

增加布局变体：

```ts
type TaskCardVariant = 'default' | 'compact'
```

- `default` 保持当前画廊外观和行为。
- `compact` 使用更紧凑的图片、提示词摘要、状态和操作栏。
- 两种变体共用收藏、重试、计时、缩略图加载和状态展示逻辑。
- `onReuse`、`onEditOutputs`、`onDelete` 和 `onClick` 继续由容器传入。
- 不创建复制版 `AgentTaskCard`，避免后续行为不一致。

### `AgentMainWorkspace`

负责展示当前选中任务：

- 空状态和生成引导。
- 运行中状态、计时和请求参数。
- 输出图片切换和查看。
- 提示词、实际参数、模型改写提示词和错误信息。
- 任务重试及现有详情操作。

为避免复制现有 `DetailModal` 的复杂逻辑，从中提取：

```text
TaskDetailContent
├─ presentation="modal"
└─ presentation="workspace"
```

`DetailModal` 保留弹窗外壳并复用 `TaskDetailContent`；`AgentMainWorkspace` 使用工作区展示方式。画廊点击任务仍打开原弹窗，Agent 点击任务只更新中栏。

### `AgentTemplateRail`

模板行为继续使用现有 `applyTemplate()`，但展示改为窄栏列表。

`TemplateCard` 增加布局变体：

```ts
type TemplateCardVariant = 'default' | 'rail'
```

`rail` 变体包含缩略图、标题、比例、尺寸、参考图标记和“使用模板”按钮。Prompt 只显示一到两行摘要。模板区独立滚动，不进入任务 Store 或 IndexedDB。

### `InputBar`

- 画廊模式保持当前定位和行为。
- Agent 桌面端根据中栏边界计算定位，不覆盖左右栏。
- 窄屏沿用当前全宽底部输入框。
- Agent 提交成功后选择返回的任务 ID。
- 复用和编辑输出后聚焦输入区域。

## 执行边界

本次建立可替换执行接口：

```ts
interface AgentGenerationRequest {
  prompt: string
  inputImageIds: string[]
  params: TaskParams
}

interface AgentExecutor {
  submit(request: AgentGenerationRequest): Promise<string | null>
}
```

首版适配器委托现有 `submitTask()`，不进行提示词规划或工具调度。`submitTask()` 调整为在任务成功写入 Store 和 IndexedDB 后返回任务 ID；失败或未创建任务时返回 `null`。

后续受限 Agent 可实现相同接口，工作台布局、任务选择和历史列表无需重做。如果 Executor 不可用，页面明确提示“Agent 执行器不可用”，不得静默切换到其他未知执行路径。

## 数据流

```text
用户输入
  → InputBar
  → AgentExecutor.submit()
  → submitTask()
  → TaskRecord 写入 Zustand + IndexedDB
  → 返回 taskId
  → AgentWorkspace.activeAgentTaskId = taskId
  → AgentMainWorkspace 展示运行状态
  → executeTask() 更新同一 TaskRecord
  → 中间工作区响应状态和图片变化
```

历史、筛选和任务数据继续来自现有 Zustand Store。模式选择、当前 Agent 任务和移动端分段只属于 React UI 状态。

## 操作行为

- 收藏：更新 `isFavorite`，不改变当前任务或分段。
- 复用：调用现有 `reuseConfig()`，填充提示词、输入图和参数，然后聚焦输入框。
- 编辑输出：调用现有 `editOutputs()`，将输出图片加载为新输入。
- 删除：使用现有确认框；确认后调用 `removeTask()`，必要时选择相邻任务。
- 重试：调用现有 `retryTask()`，中栏继续追踪对应任务状态。
- 查看详情：画廊打开 `DetailModal`；Agent 更新 `activeAgentTaskId`。
- 使用模板：调用 `applyTemplate()`，只填充 Prompt 和尺寸，不自动提交。
- 新任务：创建完成后自动成为 Agent 当前任务。

## 异常与边界状态

- 无任务：中间区显示空状态、输入引导和模板提示。
- 任务运行中：显示计时、加载态和请求参数。
- 任务失败：展示现有错误、原始响应和可用的重试入口。
- API 配置不可用：继续由现有服务端配置状态禁用提交。
- 图片缺失：沿用现有图片缺失提示，不阻塞其他历史记录。
- 当前任务被删除：自动选择相邻任务；没有任务时清空选择。
- 筛选隐藏当前任务：中间详情仍保留，直到用户选择其他任务或删除当前任务。
- 旧历史缺少可选字段：继续使用现有兼容逻辑，不触发迁移。

## 可访问性

- 模式切换和移动端分段使用按钮或 tab 语义，提供 `aria-current` 或标准 tab 属性。
- 三个区域具有清晰的 landmark 和标题关联。
- 紧凑卡所有图标按钮保留文本化 `title` 和 `aria-label`。
- 键盘可以切换模式、选择历史、使用模板和操作任务。
- sticky 栏头和固定输入框不得遮挡焦点元素。
- 动画遵循 `prefers-reduced-motion`。

## 预计文件影响

| 文件 | 变更 |
|---|---|
| `src/App.tsx` | 增加模式状态、模式切换和 Agent 页面分支 |
| `src/components/AgentWorkspace.tsx` | 新增 Agent 响应式工作台容器 |
| `src/components/AgentHistoryPanel.tsx` | 新增历史栏和任务选择 |
| `src/components/AgentMainWorkspace.tsx` | 新增中间任务工作区 |
| `src/components/AgentTemplateRail.tsx` | 新增右侧模板列表 |
| `src/components/TaskCard.tsx` | 增加 compact 变体 |
| `src/components/TemplateCard.tsx` | 增加 rail 变体 |
| `src/components/TemplateGallery.tsx` | 从画廊入口移除，保留共享模板行为 |
| `src/components/DetailModal.tsx` | 拆分弹窗外壳与共享详情内容 |
| `src/components/TaskDetailContent.tsx` | 新增共享任务详情主体 |
| `src/components/InputBar.tsx` | 增加模式感知定位和 Agent 提交回调 |
| `src/components/TaskGrid.tsx` | 使用共享任务筛选逻辑 |
| `src/lib/taskFilters.ts` | 新增任务排序和筛选纯函数 |
| `src/lib/agentExecutor.ts` | 新增 Executor 接口和首版适配器 |
| `src/store.ts` | `submitTask()` 返回任务 ID |
| 对应测试文件 | 覆盖组件变体、切换、选择和回归行为 |

## 测试计划

### 单元测试

- 任务排序和搜索、状态、收藏筛选。
- `TaskCard` 默认和 compact 变体均保留完整操作入口。
- `TemplateCard` rail 变体及 `applyTemplate()` 行为。
- `AgentExecutor` 首版适配器返回任务 ID 或 `null`。
- 删除当前任务后的相邻选择规则。

### 集成测试

- App 刷新默认显示画廊，画廊没有模板区。
- 模式切换不清空输入、参数、参考图或筛选状态。
- Agent 桌面端渲染三栏。
- 窄屏渲染“历史 / 工作区 / 模板”分段。
- 点击历史任务更新中间详情且不打开 `DetailModal`。
- 点击模板后填充输入并在窄屏切回工作区。
- 新任务创建后自动成为当前任务。
- 收藏、复用、编辑输出、删除和重试继续调用现有行为。

### 回归与视觉验证

- 运行全部 Vitest 测试。
- 运行 TypeScript 和 Vite 生产构建。
- 检查 `1440x900`、`1280x800`、`1024x768`、`390x844`。
- 覆盖浅色和深色模式、独立滚动、sticky 栏头和输入框遮挡。
- 执行 Docker 镜像构建、容器启动、运行时配置和模板资源检查。

## 验收标准

1. 刷新后默认进入画廊，画廊只显示搜索和任务网格。
2. Agent 桌面端显示左历史、中工作区、右模板三栏。
3. 小于 `1280px` 显示“历史 / 工作区 / 模板”分段导航，默认工作区。
4. 左栏展示全部共享历史，排序和筛选与画廊一致。
5. compact 任务卡保留收藏、复用、编辑输出、删除、重试和详情能力。
6. 点击历史任务后，中栏展示同一任务且不打开模态框。
7. 新任务创建后自动展示运行状态和最终图片。
8. 使用模板只填充提示词和尺寸，不自动提交。
9. 当前任务删除后选择相邻任务，无任务时显示空状态。
10. 不新增 IndexedDB schema，不迁移或丢失现有任务。
11. 画廊原任务卡、框选、批量操作和详情弹窗行为不回归。
12. 现有测试全部通过，新增功能具有单元和集成测试。
13. Vite 构建和 Docker 容器验证通过。

## 发布与回滚

本功能只改变前端组件和 UI 状态，不涉及持久化数据迁移。发布前完成全量测试、视觉检查和 Docker 验证。

回滚时移除 Agent 页面分支和新增组件，恢复 `App` 的单一画廊渲染；将 `TaskCard`、`TemplateCard`、`DetailModal`、`InputBar` 和 `submitTask()` 恢复为原接口。由于 `TaskRecord` 和 IndexedDB schema 未变化，用户历史无需恢复或转换。

真正的受限 Agent、飞书机器人和服务端任务执行作为后续独立设计，不与本次 UI 改造混合实施。
