# Agent Note: 会话感知的单图 Avatar 浮层

Status: implemented

[English](2026-08-15-session-aware-one-image-avatar.md) | 中文

## 问题

桌面应用展示了完整 Harness 工作区，但运行中的 Agent 没有持续的视觉存在。第一版角色功能需要接收用户已有的图像素材、响应权威 Agent 活动事实，并保持回环 WebView 不具备 Tauri IPC 的安全设计。平面图片也不能被描述成等同于已绑定的 Live2D 或 VRM 模型。

## 决策

`@deepseek-ai/dsh-client-ui-avatar` 是 Web bundle 中独立的 client Cordis 插件。它以叠加方式注册到 ui-layout 的 root 级 `shell.overlay` 列表插槽，并使用框架 store 引擎持久化显示开关、展示尺寸、所选内置预设和一张编码自定义图片。导入器接受不超过 1.25 MB 的 PNG、JPEG、WebP 与 GIF 源文件；此上限在 FileReader 将文件膨胀为浏览器存储数据之前执行。

Web 应用内置 Mina、Yuna、Rin 和 Sora 四张原创生成角色图。稳定的根相对 URL 让 client 插件 bundle 保持轻量，也让 Vite 将资源复制到 Web 与桌面发行物。选择预设会清除自定义图片并保留最后一个预设标识，因此用户从自定义图片返回时不会遇到含义不明的空状态。素材调研评估过第三方 CC0 角色包，但内置文件没有使用这些资源，避免默认体验依赖外部站点的下载流程或含义不够明确的源文件再分发范围。

默认渲染器是基于 `three` 和 `@pixiv/three-vrm` 的 WebGL VRM 1.0 driver。它加载 AvatarSample_A © pixiv VRoid Project；模型内嵌设置允许所有人用作 Avatar、企业商用以及署名再分发，适用 VRM Public License 1.0。署名信息随资源发布。driver 操作标准 VRM 口型表情、面部表情、眨眼，以及标准化 humanoid 的头部、脊柱、上臂和下臂骨骼。渲染器卸载时取消动画帧、断开尺寸观察、释放 WebGL 资源，并释放网格几何与材质。

一个 root 级动作投影跟随当前选中会话 binding，只发布当前局部 Assistant 回复中的可见文本块。文本末尾以确定方式选择 `aa`、`ih`、`ou`、`ee` 或 `oh`；新的流内容提高一个逐渐衰减的发音脉冲，渲染时钟提供音素内部动作。结果是文本同步音素动画，并不宣称与音频时间精确对齐。精确音频口型需要后续 TTS provider 向 driver 暴露音素或单词时间轨。

当前选中会话的摘要是活动状态真源。`running` 映射为 `working`；会话未运行时，`completed` 映射为 `complete`；其他状态映射为 `idle`。渲染器通过 CSS 动画和状态标签表达这些状态，并遵循减少动态效果的系统偏好。此投影不增加模型可见输入，也不从文本记录推断工具类型或情绪。

该功能留在现有回环 Web 应用内。它不开放 Tauri command 通道、不读取任意文件路径，也不在 sidecar 中存储大型模型资源。自定义图片缺失时回退到所选内置预设，而不是损坏的资源。

## 曾考虑的替代方案

**向运行时 WebView 开放 Tauri IPC，并立即创建原生透明窗口。** 不采用，因为当前桌面宿主刻意不向远程加载的回环内容提供 shell 与进程权限。原生窗口也不能解决角色资源所有权或 Agent 状态语义。

**把 Avatar 直接加入 ui-layout 的 AppFrame。** 不采用，因为 `shell.overlay` 是已发布的 frame-wide 浮动功能叠加扩展点。独立插件保留卸载行为，也允许部署在不 fork layout 的情况下省略此功能。

**把用户选择的图片当作 Live2D。** 不采用，因为一张位图没有骨骼、表情参数、动作图或音素目标。第一版渲染器只提供诚实的整图动画；已绑定格式留给后续 Avatar capability 上的独立 driver。

**只根据会话列表的 `running` 推断说话。** 不采用，因为工具执行和推理期间没有可见回复文本，却会产生说话动画。动作投影读取当前局部 Assistant 文本，并在会话选择改变时关闭原会话订阅。

**在 localStorage 中保存任意大小的图片。** 不采用，因为浏览器配额较小，持久化失败会令人困惑。大型角色包应进入 sidecar 管理的资源存储，并带有明确生命周期与许可元数据。

## 后果

用户可以运行具备文本同步口型、面部状态、眨眼和程序化骨骼动作的已绑定 VRM 角色，也可以切换四个内置图片角色或用一张图片更换平面 Avatar，同时不扩大桌面权限。Avatar 仍位于主应用窗口内，活动状态较粗，而且没有合成语音、音频时间对齐口型、拖动、用户 VRM 导入或原生置顶展示。这些能力需要独立的语音与资源契约，而不是继续扩张这个展示插件。
