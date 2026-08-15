# @deepseek-ai/dsh-client-ui-avatar

English | [中文](README.zh.md)

The browser Avatar plugin occupies the additive `shell.overlay` seat. Its default renderer loads a bundled VRM 1.0 character and drives mouth expressions, facial expressions, blinking, head movement, torso sway, and arm poses. Users can switch to one of four bundled original images or a selected PNG, JPEG, WebP, or GIF image. The selected renderer, preset, imported image, visibility, and display size persist in browser storage; source files are limited to 1.25 MB so one image cannot exhaust the store's ordinary quota.

The VRM renderer maps the current response's streamed text endings onto the standard `aa`, `ih`, `ou`, `ee`, and `oh` mouth expressions. Session state selects relaxed, working, and happy expressions and matching procedural bone poses. This is deterministic text-synchronous viseme animation; exact audio-time alignment remains dependent on a future TTS audio timeline. The flat-image renderer retains whole-image breathing, work, and completion motion. The plugin uses no Tauri IPC, reads no arbitrary filesystem path, and adds no model-visible input.

The bundled 3D model is AvatarSample_A © pixiv VRoid Project. Its embedded VRM 1.0 settings allow avatar use by everyone, corporate commercial use, and redistribution with credit under the VRM Public License 1.0. Full attribution ships beside the model in `apps/web/public/avatars/ATTRIBUTION.txt`.

## Model Experience

None, as Avatar state is a browser-only projection of existing session-list facts and contributes no prompt, message, tool, or session event.

#### KV Cache effect

None. Enabling, hiding, resizing, or changing the Avatar image does not change model input.

## Known Limitations and Deferred Work

- User-supplied flat images cannot provide bones or facial expression targets. A user-supplied VRM asset importer requires a sidecar-owned asset store and embedded-license validation.
- Visemes follow the generated text stream, not synthesized audio timestamps. Exact audio lip sync requires the TTS provider to publish a phoneme or word timing track.
- The current activity projection uses coarse session summary fields. Tool-specific gestures require a dedicated durable Avatar state projection rather than client-side inference from transcript text.
- Browser storage is suitable for one small image. Character bundles and large model assets require a sidecar-owned asset store.
