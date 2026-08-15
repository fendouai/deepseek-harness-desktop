# @deepseek-ai/dsh-client-ui-avatar

English | [中文](README.zh.md)

The browser Avatar plugin occupies the additive `shell.overlay` seat. It renders one of four bundled original characters, or a user-selected PNG, JPEG, WebP, or GIF image, above the Harness workspace and derives `idle`, `working`, and `complete` presentation states from the selected session summary. The selected preset, imported image, visibility, and display size persist in browser storage; source files are limited to 1.25 MB so one image cannot exhaust the store's ordinary quota.

The one-image renderer adds breathing, work, and completion motion without claiming skeletal animation or accurate lip sync. Selecting Mina, Yuna, Rin, or Sora replaces any imported image; choosing a new local image replaces the visible preset. The plugin uses no Tauri IPC, reads no arbitrary filesystem path, and adds no model-visible input.

## Model Experience

None, as Avatar state is a browser-only projection of existing session-list facts and contributes no prompt, message, tool, or session event.

#### KV Cache effect

None. Enabling, hiding, resizing, or changing the Avatar image does not change model input.

## Known Limitations and Deferred Work

- A flat image cannot provide Live2D bones, VRM motion, phoneme lip sync, or transparent native desktop placement outside the application window.
- The current activity projection uses coarse session summary fields. Tool-specific gestures require a dedicated durable Avatar state projection rather than client-side inference from transcript text.
- Browser storage is suitable for one small image. Character bundles and large model assets require a sidecar-owned asset store.
