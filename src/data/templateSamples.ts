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
    id: 'rental-price-label',
    sourceSampleId: 'task-001',
    title: '租赁价格标签设计',
    category: '文案改版',
    prompt: '将“胶片温度”修改为“¥ /天”，保留其中的空格符，在最右侧放置一个“租”的标识符，符号要有设计感，作为醒目的标签。比例407:85\n',
    imageSrc: templateImageUrl('task-001.webp'),
    ratio: '2:1',
    size: '1778x884',
    requiresReference: true,
    alt: '绿色租赁价格标签设计预览',
  },
  {
    id: 'portrait-trouser-edit',
    sourceSampleId: 'task-025',
    title: '人物长裤造型替换',
    category: '人物编辑',
    prompt: '将腿部替换为女性的腿部，但保留现在的长裤穿搭，分辨率为1254*1254。\n',
    imageSrc: templateImageUrl('task-025.webp'),
    ratio: '1:1',
    size: '1254x1254',
    requiresReference: true,
    alt: '演出设备海报人物长裤造型替换预览',
  },
  {
    id: 'rental-brand-badge',
    sourceSampleId: 'task-038',
    title: '蓝白租赁品牌徽章',
    category: '品牌设计',
    prompt: '为 团团享租 设计一个LOGO，该公司业务内容包括手机、相机、CCD、镜头等3C数码租赁；笔画共用，整体呈圆形徽章样式，蓝白配色，互联网行业风格。简洁现代有设计感，矢量风格，白色背景，LOGO中要体现出团团享租的业务方向，主要面向C端用户，因此设计时美感在线，使C端用户感到可靠\n',
    imageSrc: templateImageUrl('task-038.webp'),
    ratio: '1:1',
    size: '1254x1254',
    requiresReference: false,
    alt: '蓝白圆形团团享租品牌徽章预览',
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
