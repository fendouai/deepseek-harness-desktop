# Agent Note: Tauri 桌面 sidecar 宿主

Status: implemented

[English](2026-08-14-tauri-desktop-sidecar-host.md) | 中文

## Problem

浏览器组合已经承载完整的交互产品，而桌面发行版还必须在用户未单独安装 Node 的情况下启动，避免固定端口冲突，将桌面数据与 CLI 数据隔离，并在应用退出时停止本地服务器。在原生壳中重新实现 Web 宿主会重复 profile 组合、会话行为和客户端传输。

## Decision

`apps/desktop` 是监督现有 `dsh web` 应用的 Tauri 2 宿主。其准备步骤构建 Harness 产物，实体化 `@deepseek-ai/dsh` 的 hoisted 生产部署，并把经过校验和验证的官方 Node 24 可执行文件作为按 target triple 命名的 Tauri sidecar 打包。发行任务也可通过 `DSH_NODE_BINARY` 提供等效的目标平台可执行文件。

Rust 宿主使用已部署的 `lib/bin.js web --port 0` 启动 sidecar，把 `DSH_HOME` 设为 Tauri 应用数据目录的 `dsh` 子目录，并等待既有的 `dsh web: http://127.0.0.1:<port>` 就绪行。只有经过验证的 loopback URL 可以替换本地启动文档。应用退出时会终止受监督的子进程。

启动文档只具有 Tauri 核心窗口权限。Sidecar 控制保留在 Rust 中，因此 loopback Web 应用不会获得 Tauri shell 权限。工作区选择和全部产品交互继续由既有 Web 组合处理。

## Alternatives considered

**Electron 宿主。** Electron 自带 Chromium 和 Node，但会重复产品已由 dsh 进程承载的运行时设施，并产生更大的发行包。

**原生重写 Web 宿主。** 把 profile、gateway 或会话行为迁入 Rust 会产生第二套应用组合，并使桌面发行与内部 package 变更耦合。

**固定 loopback 端口。** 3080 会与现有 CLI 服务器或另一个桌面实例冲突。端口零让操作系统分配空闲端口，既有就绪行可传递实际地址，无需第二套协议。

**WebView 可调用的 sidecar 命令。** 向已加载的应用授予 shell 权限会扩大前端漏洞的影响。Rust 宿主监督一个固定运行时时不需要浏览器到原生端的命令。

## Consequences

桌面升级复用浏览器产品和已发布 CLI 的依赖图，不引入 desktop profile。应用会携带明确的 Node payload 和较大的资源树，但用户无需安装 Node 或管理服务器。桌面会话和设置与 `~/.dsh` 隔离；与 CLI 共享它们需要未来明确的产品决策。

第一版桌面应用保留 Web 组合的工作区选择器。原生选择器需要单独的宿主能力和 RPC 集成；增加该能力不会改变 sidecar 的所有权。
