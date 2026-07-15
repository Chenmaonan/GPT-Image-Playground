# 工作台模板展示设计

## 目标

在 Agent 工作台主区域加入可直接浏览和复用的模板展示。模板从 `image-sample-library/gpt-image-playground-20260715-excellent` 中精选，卡片视觉沿用现有历史生成记录卡片，但模板数据与用户历史任务完全隔离。

成功标准：

- Agent 工作台默认能看到模板区，不新增顶级路由或模式。
- 首批展示 6 个内容和能力类型不同的模板，避免重复 Prompt 占据首屏。
- 模板卡片与历史生成卡片保持一致的横向结构、尺寸、边框、图片区域、标签和交互反馈。
- 点击“使用模板”只填充 Prompt 和尺寸参数，不自动调用生成 API。
- 依赖输入图片的模板明确标记“需参考图”，避免用户误以为可直接复现。
- 模板不进入 `tasks`、IndexedDB、历史搜索、收藏、删除或批量选择流程。

## 范围

本次包含：

- Agent 工作台模板列表。
- 6 个精选模板的静态预览图和人工整理元数据。
- 模板卡片及“使用模板”交互。
- 响应式、深色模式、基础可访问性和测试。

本次不包含：

- 模板搜索、分类筛选、分页或远程配置后台。
- 模板详情弹窗、静态图片 Lightbox 改造。
- 自动补充缺失的参考图、遮罩或原始输入图。
- 模板收藏、删除、用户自定义模板或同步功能。
- 第三个顶级“模板”模式或路由持久化。

## 方案选择

采用独立的 `TemplateGallery` 和 `TemplateCard`。模板卡沿用 `TaskCard` 的视觉规范，但不直接复用 `TaskCard`，因为后者同时承担 IndexedDB 缩略图加载、任务状态计时、重试、收藏、编辑、删除、触摸侧滑和多选等历史任务行为。

这样可以保持视觉一致，同时避免伪造 `TaskRecord` 或把静态模板写入任务 Store。共享的是设计规范和布局，不共享不兼容的任务语义。

## 页面结构

`AgentWorkspace` 保留现有顶部区域：

- Agent/画廊模式切换。
- 完成、运行、异常任务统计。

原居中占位说明替换为模板内容区：

```text
AgentWorkspace
├─ 顶部模式与任务统计
└─ TemplateGallery
   ├─ 标题与简短副标题
   └─ 响应式网格
      └─ TemplateCard × 6
```

网格规则：

- 默认单列。
- `sm` 起双列。
- 可用宽度足够时三列。
- 底部保留足够间距，避免固定输入栏遮挡最后一行卡片。

## 卡片设计

模板卡沿用历史生成记录卡片的主要视觉特征：

- 白色/深色背景、浅边框、`rounded-xl`、hover 边框和阴影。
- 固定高度的横向卡片，左侧固定宽度预览图，右侧为信息和操作。
- 图片使用 `object-cover` 和 `loading="lazy"`，宽图允许居中裁切。
- 图片左上角显示比例和模板声明尺寸。
- 信息区显示模板标题、两行 Prompt 摘要和标签。
- 操作区只保留带复用图标的“使用模板”按钮，不显示收藏、编辑输出、删除、重试和选择状态。

模板卡本身不接入任务多选、拖拽框选或触摸侧滑。卡片按钮提供可读的 `aria-label` 和 `title`。

## 模板数据

模板使用独立只读数据模型：

```ts
interface TemplateSample {
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

首批模板：

| 样例 | 标题 | 类别 | 参考图要求 |
| --- | --- | --- | --- |
| `task-004` | 科技循环品牌 LOGO | 品牌设计 | 否 |
| `task-013` | 旅行租赁小程序头图 | 营销视觉 | 是 |
| `task-005` | 商业海报服装调色 | 图像编辑 | 是 |
| `task-006` | 人像发丝细节增强 | 细节增强 | 是 |
| `task-007` | 旅行海报广角扩图 | 扩图改版 | 是 |
| `task-024` | 演出设备促销横幅合成 | 广告合成 | 是 |

只复制以上 6 张 WebP 到 `public/templates/`，不把完整 43 张样例打入生产资源。数据模块保留导出库中的样例 ID，便于回溯原始 Prompt 和元数据。

图片地址通过 `import.meta.env.BASE_URL` 构造，兼容当前 Vite `base: './'` 和 GitHub Pages 子路径部署，不使用以 `/` 开头的根路径。

## 交互与数据流

```text
TemplateCard 点击“使用模板”
  -> 读取当前 Zustand Store
  -> setPrompt(template.prompt)
  -> setParams({ size: template.size })
  -> showToast("已应用模板，可继续修改后生成", "success")
  -> 聚焦或滚动到现有底部输入栏
```

约束：

- 不调用 `submitTask`，不自动产生 API 费用。
- 使用模板会明确覆盖当前 Prompt 和尺寸；按钮文案已经表达这是主动操作，不额外增加确认弹窗。
- 不修改 Provider、Model、Quality、输出格式和图片数量，避免用样例库中缺失或不可靠的数据覆盖用户配置。
- `requiresReference` 只用于展示提示。样例库没有保存原始输入图，因此不会把输出预览图错误加入输入图片。
- Prompt 中的 `<ref>` 或“图1/图2”保持原文，用户需要自行上传相应参考图。

## 状态与错误处理

模板数据在构建期静态定义，不依赖网络请求，因此不需要加载态和接口错误态。

图片加载失败时：

- 预览区显示与历史卡一致的图片占位图标。
- 文字、标签和“使用模板”仍可使用。

若模板尺寸字符串为空或异常，交互只填充 Prompt，不覆盖当前尺寸。测试保证首批 6 条数据均有有效 ID、Prompt、图片路径、比例和尺寸。

## 文件边界

预计新增：

- `src/components/TemplateGallery.tsx`
- `src/components/TemplateCard.tsx`
- `src/data/templateSamples.ts`
- `src/data/templateSamples.test.ts`
- `src/components/AgentWorkspace.test.tsx`
- `public/templates/` 下 6 张 WebP

预计修改：

- `src/components/AgentWorkspace.tsx`

不修改：

- `src/App.tsx`
- `src/components/TaskCard.tsx`
- `src/store.ts`
- `src/types.ts`
- IndexedDB schema 和部署配置

## 验证

自动验证：

1. `templateSamples` 数据测试：数量固定为 6、ID 唯一、必填字段完整、图片地址和参考图标记正确。
2. `AgentWorkspace` 静态渲染测试：模板标题、6 张卡片、图片懒加载、使用按钮和“需参考图”标签存在。
3. `npm test`：全量回归。
4. `npm run build`：TypeScript 与 Vite 生产构建。

视觉验证：

- `1440x900`、`1024x768`、`390x844`。
- 浅色和深色模式。
- 卡片列数、固定尺寸、长 Prompt 截断、宽图裁切、hover/focus、底部输入栏遮挡情况。
- 点击模板后 Prompt 与尺寸正确写入，且没有新建任务或自动发起 API 请求。
- GitHub Pages 相对路径下 6 张模板图可正常加载。

仓库存在完整 Docker 部署链路。常规本地测试完成后，再单独询问是否执行 Docker 测试部署。

## 回滚

回滚只需移除模板组件、模板数据、6 张静态图片和 `AgentWorkspace` 中的模板渲染入口。由于不修改 Store、任务结构、IndexedDB 或路由，不涉及数据迁移和用户历史记录恢复。
