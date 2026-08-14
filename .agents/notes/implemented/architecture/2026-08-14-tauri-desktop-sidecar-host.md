# Agent Note: Tauri desktop sidecar host

Status: implemented

English | [中文](2026-08-14-tauri-desktop-sidecar-host.zh.md)

## Problem

The browser composition already owns the complete interactive product, while a desktop distribution must start without a separately installed Node runtime, avoid fixed-port collisions, keep desktop data separate from CLI data, and stop its local server when the application exits. Reimplementing the Web host inside a native shell would duplicate profile composition, session behavior, and client transport.

## Decision

`apps/desktop` is a Tauri 2 host that supervises the existing `dsh web` application. Its prepare step builds the Harness artifacts, materializes a hoisted production deployment of `@deepseek-ai/dsh`, and bundles a checksum-verified official Node 24 executable as a target-triple Tauri sidecar. Release jobs may supply an equivalent target-specific executable through `DSH_NODE_BINARY`.

The Rust host starts the sidecar with the deployed `lib/bin.js web --port 0`, sets `DSH_HOME` to the Tauri application data directory's `dsh` child, and waits for the existing `dsh web: http://127.0.0.1:<port>` readiness line. Only a validated loopback URL can replace the local startup document. Application exit kills the supervised child.

The startup document has only Tauri core window permissions. Sidecar control remains in Rust, so the loopback Web application receives no Tauri shell capability. Workspace selection and all product interaction continue through the existing Web composition.

## Alternatives considered

**Electron host.** Electron includes Chromium and Node, but duplicates runtime facilities that the product already carries in the dsh process and produces a larger distribution.

**Native reimplementation of the Web host.** Moving profiles, the gateway, or session behavior into Rust creates a second application composition and couples desktop releases to internal package changes.

**A fixed loopback port.** Port 3080 conflicts with an existing CLI server or another desktop instance. Port zero lets the OS allocate a free port, and the existing readiness line communicates the selected address without a second protocol.

**WebView-accessible sidecar commands.** Granting the loaded application shell permissions enlarges the impact of a frontend compromise. The Rust host needs no browser-to-native command to supervise one fixed runtime.

## Consequences

Desktop upgrades reuse the browser product and the published CLI dependency graph instead of introducing a desktop profile. The application has an explicit Node payload and a larger resource tree, but users do not install Node or manage a server. Desktop sessions and settings are isolated from `~/.dsh`; sharing them with the CLI requires a future explicit product choice.

The first desktop version retains the Web composition's workspace picker. A native picker requires a separate host capability and RPC integration; adding it does not change sidecar ownership.
