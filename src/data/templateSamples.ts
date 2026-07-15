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

const templateImageUrl = (fileName: string) =>
  `${import.meta.env.BASE_URL}templates/${fileName}`

export const TEMPLATE_SAMPLES = [
  {
    id: 'circular-tech-logo',
    sourceSampleId: 'task-004',
    title: '科技循环品牌 LOGO',
    category: '品牌设计',
    prompt: '为中文品牌“团团享”设计一个现代简约高级的品牌LOGO。品牌主营3C数码租赁，倡导绿色循环、以租代购、共享经济、智能化全自动运营、AI辅助业务。视觉联想：两个或三个柔和圆环围合成循环箭头/共享环，中心可融合极简电子设备轮廓（手机、平板、笔记本的抽象几何线条）或AI芯片节点，表达“团聚、循环、共享、智能”。整体风格：高端科技感、干净留白、矢量标志、适合App图标和企业VI。配色：深墨蓝/科技黑为主，搭配环保青绿渐变或电光蓝点缀，低饱和、高级。字体：中文“团团享”使用定制几何无衬线字体，圆润但不幼稚，字形稳定可信，旁边可有英文小字“TuanTuan Share”或“AI Circular Tech Leasing”。画面为白色或浅灰背景，居中展示完整LOGO：图形标志 + 中文品牌字。不要复杂插画，不要摄影，不要3D夸张效果，不要过多细节，强调可识别、可商用、简洁高级。\n',
    imageSrc: templateImageUrl('task-004.webp'),
    ratio: '1:1',
    size: '1254x1254',
    requiresReference: false,
    alt: '团团享科技循环品牌 LOGO 预览',
  },
  {
    id: 'travel-rental-miniapp-hero',
    sourceSampleId: 'task-013',
    title: '旅行租赁小程序头图',
    category: '营销视觉',
    prompt: '根据图2，以图1为灵感，生成一张#31C883颜色为主，也就是图三颜色为主的小程序头图，我们的业务是相机、手机、运动相机租赁。比例1:1，分辨率1254*1254。要求呈现出用户看到图片就有想要和朋友一起出游拍合照，想要出去玩的冲动，进而引导用户在我们的小程序里下单。不要原样照抄图2，图2只代表目的效果，并不是设计方向\n',
    imageSrc: templateImageUrl('task-013.webp'),
    ratio: '1:1',
    size: '1254x1254',
    requiresReference: true,
    alt: '旅行数码租赁小程序头图预览',
  },
  {
    id: 'commercial-poster-clothing-colors',
    sourceSampleId: 'task-005',
    title: '商业海报服装调色',
    category: '图像编辑',
    prompt: '对用户提供的参考海报进行图像编辑 <ref id="round-5-reference-1" />。保持原始内容、构图、人物数量与姿势、表情、文字、图标、产品、背景、主视觉绿色黄色海报元素、清晰度和排版完全不变，不新增或删除任何元素，不改变任何中文文字。仅优化五位人物的服装颜色：让衣服颜色更自然、更符合现实旅行合照，不要所有人都过于统一的浅绿/白色。使用低饱和、柔和的莫兰迪色系为主，例如雾霾蓝、灰粉、燕麦米色、浅卡其、柔和灰绿、淡藕紫、浅陶土色等；颜色要多样但协调，不能太鲜艳、不能浓郁、不能抢走海报绿色主视觉。保留服装材质、褶皱、光影、阴影和真实感，背包和相机可保持原有绿色系或仅轻微协调，不影响品牌主色。人物皮肤、头发、脸部、背景湖山、木牌、便签、所有文字和底部按钮完全保持不变。输出正方形海报，分辨率 1254x1254。\n',
    imageSrc: templateImageUrl('task-005.webp'),
    ratio: '1:1',
    size: '1254x1254',
    requiresReference: true,
    alt: '旅行商业海报服装调色预览',
  },
  {
    id: 'portrait-hair-detail-enhancement',
    sourceSampleId: 'task-006',
    title: '人像发丝细节增强',
    category: '细节增强',
    prompt: '对用户提供的参考海报进行图像编辑 <ref id="round-3-reference-1" />。严格保持原始内容、构图、人物数量与姿势、表情、文字、图标、产品、背景、配色和排版完全不变，不新增或删除任何元素，不改变任何中文文字。仅针对五位人物的头发进行真实感细节优化：细化发丝纹理，增加自然的单根发丝、发束层次、边缘碎发、受光高光发丝和暗部发丝分离度，让头发更真实、更清晰、更有细节；避免头发变成过度锐化、油亮、塑料感或杂乱毛躁。保持脸部、皮肤、衣物、背景和所有图文元素基本不变。整体海报清晰自然，商业广告质感，中文文字保持清晰准确无乱码。输出正方形图像，分辨率 2048x2048。\n',
    imageSrc: templateImageUrl('task-006.webp'),
    ratio: '1:1',
    size: '1254x1254',
    requiresReference: true,
    alt: '旅行海报人像发丝细节增强预览',
  },
  {
    id: 'travel-poster-wide-outpainting',
    sourceSampleId: 'task-007',
    title: '旅行海报广角扩图',
    category: '扩图改版',
    prompt: '对用户提供的参考海报进行图像编辑 <ref id="round-2-reference-1" />。严格保持原始内容、人物、文字、图标、产品、配色、风格和排版关系不改变，不新增或删除任何核心元素，不改文字内容。提升整体图片清晰度、锐度和细节质感，使人物、文字、产品图标和背景更清楚可读，但不要过度锐化或产生噪点。将视角再广一倍：相当于镜头向后拉远/画布外扩，保留原画全部内容并缩小到画面中心区域，四周自然扩展出同一湖边旅行场景、蓝天白云、远山、湖水、木栈道/栏杆等背景延展，保持商业海报设计感和原有绿色黄色手绘元素的协调。扩展区域不能出现乱码、重复残影、畸形人物或多余文字；原有所有中文文字需保持清晰准确。最终为正方形海报，分辨率 1254x1254。\n',
    imageSrc: templateImageUrl('task-007.webp'),
    ratio: '1:1',
    size: '1254x1254',
    requiresReference: true,
    alt: '湖边旅行商业海报广角扩图预览',
  },
  {
    id: 'show-equipment-promo-banner',
    sourceSampleId: 'task-024',
    title: '演出设备促销横幅合成',
    category: '广告合成',
    prompt: '将图二融入到图1的右侧底部，注意元素的协调，不要互相遮挡，可以缩小图2。输出图片比例为2：1\n',
    imageSrc: templateImageUrl('task-024.webp'),
    ratio: '2:1',
    size: '1774x887',
    requiresReference: true,
    alt: '演出设备促销横幅合成预览',
  },
] as const satisfies readonly TemplateSample[]
