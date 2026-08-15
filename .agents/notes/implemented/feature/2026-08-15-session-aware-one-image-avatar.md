# Agent Note: Session-aware one-image Avatar overlay

Status: implemented

English | [中文](2026-08-15-session-aware-one-image-avatar.zh.md)

## Problem

The desktop application presents the complete Harness workspace but gives a running Agent no persistent visual presence. A first character feature must accept artwork users already own, react to authoritative Agent activity, and preserve the loopback WebView's lack of Tauri IPC. A flat image also must not be presented as equivalent to a rigged Live2D or VRM model.

## Decision

`@deepseek-ai/dsh-client-ui-avatar` is an independent client Cordis plugin in the Web bundle. It registers additively into ui-layout's root-scoped `shell.overlay` list seat and uses the framework store engine to persist visibility, display size, the selected bundled preset, and one encoded custom image. The importer accepts PNG, JPEG, WebP, and GIF source files up to 1.25 MB; the limit bounds the value before FileReader expands it into browser storage.

The Web application ships four original generated character illustrations: Mina, Yuna, Rin, and Sora. Their stable root-relative URLs keep the client plugin bundle small and let Vite copy the assets into both Web and desktop distributions. Selecting a preset clears the custom image while retaining the last preset identifier, so users can return from a custom image without an ambiguous empty state. The source investigation considered third-party CC0 packs, but the built-in files do not incorporate them; this avoids coupling the default experience to an external host's download flow or uncertain source-asset redistribution scope.

The default renderer is a WebGL VRM 1.0 driver built on `three`, `@pixiv/three-vrm`, and the official MIT-licensed `@pixiv/three-vrm-animation` implementation. It loads AvatarSample_A © pixiv VRoid Project; the model's embedded settings allow avatar use by everyone, corporate commercial use, and redistribution with credit under the VRM Public License 1.0. Attribution ships beside the asset. An `AnimationMixer` cross-fades original idle-observation, working/typing, speaking-gesture, and completion-wave clips over normalized humanoid bones; speaking has temporary priority and completion plays once. Variable-interval blinking, moving gaze, visemes, and task expressions remain independent facial layers. Renderer teardown cancels its animation frame, disconnects resize observation, stops and uncaches the mixer, disposes WebGL resources, and releases mesh geometry and materials.

A root-scoped motion projection follows the selected session binding and publishes only the visible text blocks in its current partial assistant response. Text endings deterministically select `aa`, `ih`, `ou`, `ee`, or `oh`; new stream content raises a decaying articulation pulse while the render clock supplies intra-phoneme motion. The result is text-synchronous viseme animation, not a claim of audio-time alignment. Exact audio lip sync requires a later TTS provider to expose a phoneme or word timing track to the driver.

The same projection owns Avatar conversation delivery: `Talk` sends typed text and finalized microphone transcripts through the selected Session's ordinary queued `prompt()` path, so both inputs have the same admission, logging, and task semantics as the main composer. A one-shot `Speak` request automatically sends after recognition finalizes. Optional hands-free mode uses echo-safe turn taking: listen, stop before delivery, wait for a different finalized Assistant sequence, play enabled speech output, then resume listening. It does not keep the microphone open over speaker playback. Unsupported recognition fails locally without weakening text conversation. The packaged macOS app declares microphone, speech-recognition, and hardened-runtime audio-input permissions. Debug runtime URLs carry an explicit marker that prevents the bare `tauri dev` binary from invoking privacy-sensitive speech APIs without an application bundle. System speech events also hold mouth animation active during spoken replies.

The selected session summary is the activity authority. `running` maps to `working`, `completed` maps to `complete` when the session is not running, and every other state maps to `idle`. The renderer expresses those states through CSS motion and a status label while respecting reduced-motion preference. This projection adds no model-visible input and does not infer tool identity or emotion from transcript text.

The feature remains inside the existing loopback Web application. It opens no Tauri command channel, reads no arbitrary filesystem path, and stores no large model asset in the sidecar. A missing custom image falls back to the selected bundled preset rather than a broken resource.

## Alternatives considered

**Grant the runtime WebView Tauri IPC and create a native transparent window immediately.** Rejected because the current desktop host deliberately withholds shell and process authority from remotely loaded loopback content. A native window also does not solve character asset ownership or Agent state semantics.

**Add the Avatar directly to ui-layout's AppFrame.** Rejected because `shell.overlay` is the shipped additive extension point for frame-wide floating features. An independent plugin retains unload behavior and lets deployments omit the feature without forking layout.

**Treat a selected image as Live2D.** Rejected because one raster image has no bones, expression parameters, motion graph, or phoneme targets. The first renderer adds honest whole-image motion; rigged formats remain separate drivers over a later Avatar capability.

**Infer speech from session-list `running` alone.** Rejected because it would animate speech during tool execution and reasoning with no visible answer text. The motion projection reads the current partial assistant text and closes its session subscription when selection changes.

**Persist arbitrary-size images in localStorage.** Rejected because browser quotas are small and persistence failure would be surprising. Large character bundles belong in a sidecar-owned asset store with explicit lifecycle and licensing metadata.

## Consequences

Users can run a rigged VRM character with visible idle motion, text-synchronous mouth expressions, facial states, blinking, and procedural skeletal movement; talk to the selected task by text or supported system speech; hear finalized replies; switch among four bundled image characters; or change the flat Avatar with one image. The Avatar remains inside the main application window, activity is coarse, and there is no provider-owned audio timing, dragging, user VRM import, or native always-on-top placement. Those additions require independent speech and asset contracts rather than growth inside this presentation plugin.
