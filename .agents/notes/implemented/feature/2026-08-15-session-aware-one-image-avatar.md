# Agent Note: Session-aware one-image Avatar overlay

Status: implemented

English | [中文](2026-08-15-session-aware-one-image-avatar.zh.md)

## Problem

The desktop application presents the complete Harness workspace but gives a running Agent no persistent visual presence. A first character feature must accept artwork users already own, react to authoritative Agent activity, and preserve the loopback WebView's lack of Tauri IPC. A flat image also must not be presented as equivalent to a rigged Live2D or VRM model.

## Decision

`@deepseek-ai/dsh-client-ui-avatar` is an independent client Cordis plugin in the Web bundle. It registers additively into ui-layout's root-scoped `shell.overlay` list seat and uses the framework store engine to persist visibility, display size, the selected bundled preset, and one encoded custom image. The importer accepts PNG, JPEG, WebP, and GIF source files up to 1.25 MB; the limit bounds the value before FileReader expands it into browser storage.

The Web application ships four original generated character illustrations: Mina, Yuna, Rin, and Sora. Their stable root-relative URLs keep the client plugin bundle small and let Vite copy the assets into both Web and desktop distributions. Selecting a preset clears the custom image while retaining the last preset identifier, so users can return from a custom image without an ambiguous empty state. The source investigation considered third-party CC0 packs, but the built-in files do not incorporate them; this avoids coupling the default experience to an external host's download flow or uncertain source-asset redistribution scope.

The selected session summary is the activity authority. `running` maps to `working`, `completed` maps to `complete` when the session is not running, and every other state maps to `idle`. The renderer expresses those states through CSS motion and a status label while respecting reduced-motion preference. This projection adds no model-visible input and does not infer tool identity or emotion from transcript text.

The feature remains inside the existing loopback Web application. It opens no Tauri command channel, reads no arbitrary filesystem path, and stores no large model asset in the sidecar. A missing custom image falls back to the selected bundled preset rather than a broken resource.

## Alternatives considered

**Grant the runtime WebView Tauri IPC and create a native transparent window immediately.** Rejected because the current desktop host deliberately withholds shell and process authority from remotely loaded loopback content. A native window also does not solve character asset ownership or Agent state semantics.

**Add the Avatar directly to ui-layout's AppFrame.** Rejected because `shell.overlay` is the shipped additive extension point for frame-wide floating features. An independent plugin retains unload behavior and lets deployments omit the feature without forking layout.

**Treat a selected image as Live2D.** Rejected because one raster image has no bones, expression parameters, motion graph, or phoneme targets. The first renderer adds honest whole-image motion; rigged formats remain separate drivers over a later Avatar capability.

**Persist arbitrary-size images in localStorage.** Rejected because browser quotas are small and persistence failure would be surprising. Large character bundles belong in a sidecar-owned asset store with explicit lifecycle and licensing metadata.

## Consequences

Users can switch among four bundled characters or change the Avatar's appearance with one image and see it move between idle, working, and completion states without expanding desktop authority. The Avatar remains inside the main application window, activity is coarse, and there is no voice, lip sync, skeletal animation, dragging, or native always-on-top placement. Those additions require independent speech, asset, and Avatar-driver contracts rather than growth inside this presentation plugin.
