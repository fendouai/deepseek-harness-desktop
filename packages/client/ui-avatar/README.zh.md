# @deepseek-ai/dsh-client-ui-avatar

[English](README.md) | 中文

浏览器 Avatar 插件占用可叠加的 `shell.overlay` 插槽。默认渲染器加载一个内置 VRM 1.0 角色，并驱动口型表情、面部表情、眨眼、头部动作、躯干摆动和手臂姿势。用户可以切换到四个内置原创图片之一，或选择一张 PNG、JPEG、WebP 或 GIF 图片。所选渲染器、预设、导入图片、显示开关和尺寸保存在浏览器存储中；源文件限制为 1.25 MB，避免单张图片耗尽常规存储配额。

VRM 渲染器把当前回复流式文本的末尾字符映射到标准 `aa`、`ih`、`ou`、`ee` 和 `oh` 口型表情。会话状态选择放松、工作与开心表情及对应的程序化骨骼姿势。这是确定性的文本同步音素动画；精确音频时间对齐仍依赖后续 TTS 音频时间轴。平面图片渲染器继续提供整图呼吸、工作与完成动画。插件不使用 Tauri IPC，不读取任意文件路径，也不增加模型可见输入。

内置 3D 模型为 AvatarSample_A © pixiv VRoid Project。其内嵌 VRM 1.0 设置允许所有人用作 Avatar、企业商用以及署名再分发，适用 VRM Public License 1.0。完整署名随模型保存在 `apps/web/public/avatars/ATTRIBUTION.txt`。

`Talk` 控件通过当前任务的常规排队 prompt 方法把输入文字直接发送给当前选中的 Harness 任务。平台 WebView 提供 Web Speech Recognition API 时，麦克风控件使用该能力；识别文字会保留在输入框中，供用户确认后再发送。`Read Assistant replies aloud` 使用系统 Speech Synthesis API，并在播放语音时驱动相同的 VRM 口型目标。打包后的 macOS 应用声明麦克风、语音识别与音频输入权限。裸 `tauri dev` 二进制无法携带这些 bundle 声明，因此它的麦克风控件会在本地停止，不会调用 macOS 隐私服务。平台不支持 Web Speech Recognition 时，文字对话和回复朗读仍然可用，麦克风会在本地报告不支持。

## 模型体验

无，因为 Avatar 状态只是现有会话列表事实的浏览器投影，不贡献提示词、消息、工具或会话事件。

#### KV Cache 影响

无。启用、隐藏、缩放或更换 Avatar 图片不会改变模型输入。

## 已知限制与延期工作

- 用户提供的平面图片不能提供骨骼或面部表情目标。用户 VRM 资源导入器需要由 sidecar 管理资源存储并验证内嵌许可。
- 音素口型跟随生成文本流，而非合成音频时间戳。精确音频口型需要 TTS provider 发布音素或单词时间轨。
- 系统语音识别与合成的质量、声音、网络要求和语言覆盖范围因操作系统及 WebView 而异。
- 当前活动投影只使用粗粒度会话摘要字段。工具专属动作需要独立的持久 Avatar 状态投影，而不是从文本记录中在客户端推断。
- 浏览器存储适合一张小图片。角色包与大型模型资源需要由 sidecar 管理的资源存储。
