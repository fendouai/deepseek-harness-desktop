# `dsh-desktop`

English | [中文](README.zh.md)

The desktop application is a Tauri 2 host around the existing `dsh web` application. It bundles a Node executable as a Tauri sidecar, deploys the production `@deepseek-ai/dsh` dependency tree as an application resource, starts `dsh web --port 0`, and navigates the main WebView to the loopback URL only after the runtime prints its readiness line.

## Development

Prerequisites are the repository's Node and pnpm versions, Rust, and the platform dependencies required by Tauri 2.

```sh
pnpm --filter dsh-desktop dev
```

The prepare step builds the Harness libraries and Web frontend, creates a hoisted production pnpm deployment under `src-tauri/runtime`, downloads and verifies the pinned official Node 24 distribution, and copies its executable to Tauri's target-triple sidecar filename. Set `DSH_NODE_BINARY` to use a release-controlled Node executable, and set `DSH_DESKTOP_TARGET` when preparing a non-host target:

```sh
DSH_NODE_BINARY=/path/to/node \
DSH_DESKTOP_TARGET=x86_64-unknown-linux-gnu \
pnpm --filter dsh-desktop build -- --target x86_64-unknown-linux-gnu
```

`DSH_NODE_BINARY` must match the requested target. Cross-platform release jobs own obtaining and signing that Node distribution.

## Runtime behavior

Desktop data is isolated from the CLI under Tauri's application data directory at `dsh/`. The Web server binds only to `127.0.0.1` on an OS-assigned port. Closing the application terminates the supervised Node process. Workspace selection, sessions, settings, and agent interactions remain owned by the existing Web composition.

The local startup document has no Tauri IPC capability. Sidecar launch and shutdown stay in Rust, so the remotely loaded loopback UI cannot invoke arbitrary shell commands through Tauri.
