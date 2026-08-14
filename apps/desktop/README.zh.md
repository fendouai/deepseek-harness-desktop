# `dsh-desktop`

[English](README.md) | 中文

桌面应用是既有 `dsh web` 应用外层的 Tauri 2 宿主。它把 Node 可执行文件作为 Tauri sidecar 打包，将 `@deepseek-ai/dsh` 的生产依赖树部署为应用 resource，启动 `dsh web --port 0`，并且只在运行时输出就绪行后才把主 WebView 导航到 loopback URL。

## 开发

前置条件包括仓库要求的 Node 和 pnpm 版本、Rust，以及 Tauri 2 在当前平台所需的依赖。

```sh
pnpm --filter dsh-desktop dev
```

准备步骤会构建 Harness 库和 Web 前端，在 `src-tauri/runtime` 中创建 hoisted 生产部署，下载并校验固定版本的官方 Node 24 发行包，然后把其可执行文件复制到 Tauri 按 target triple 命名的 sidecar 路径。使用 `DSH_NODE_BINARY` 可指定发行流程管理的 Node 可执行文件；为非宿主目标准备产物时使用 `DSH_DESKTOP_TARGET`：

```sh
DSH_NODE_BINARY=/path/to/node \
DSH_DESKTOP_TARGET=x86_64-unknown-linux-gnu \
pnpm --filter dsh-desktop build -- --target x86_64-unknown-linux-gnu
```

`DSH_NODE_BINARY` 必须与目标平台匹配。跨平台发行任务负责取得并签名对应的 Node 发行包。

## 运行时行为

桌面数据与 CLI 数据隔离，保存在 Tauri 应用数据目录的 `dsh/` 下。Web 服务器只绑定到 `127.0.0.1` 上由操作系统分配的端口。关闭应用时会终止受监督的 Node 进程。工作区选择、会话、设置和 agent 交互继续由既有 Web 组合负责。

本地启动文档不具有 Tauri IPC 能力。Sidecar 的启动与关闭由 Rust 处理，因此通过 loopback 加载的 UI 无法经 Tauri 调用任意 shell 命令。
