/** Persistent browser preferences for the Avatar overlay. */
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client'

/** Maximum encoded source file size accepted by the browser importer. */
export const MAX_AVATAR_IMAGE_BYTES = 1_310_720

/** Supported source MIME types for one-image characters. */
export const AVATAR_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const

/** Bundled original characters available without importing a user image. */
export const AVATAR_PRESETS = [
  { id: 'mina', name: 'Mina', image: '/avatars/mina.png' },
  { id: 'yuna', name: 'Yuna', image: '/avatars/yuna.png' },
  { id: 'rin', name: 'Rin', image: '/avatars/rin.png' },
  { id: 'sora', name: 'Sora', image: '/avatars/sora.png' },
] as const

/** Stable identifier for a bundled Avatar character. */
export type AvatarPresetId = typeof AVATAR_PRESETS[number]['id']

/** Persistent Avatar preference state. */
export interface AvatarStoreState {
  enabled: boolean
  image: string | null
  preset: AvatarPresetId
  size: number
}

type AvatarActions = {
  toggle: (draft: AvatarStoreState) => void
  setImage: (draft: AvatarStoreState, image: string) => void
  selectPreset: (draft: AvatarStoreState, preset: AvatarPresetId) => void
  setSize: (draft: AvatarStoreState, size: number) => void
}

/**
 * Clamp the visible character size to the supported layout interval.
 * @param size Requested CSS-pixel width.
 * @returns Rounded CSS-pixel width between 180 and 420.
 */
export function clampAvatarSize(size: number): number {
  return Math.min(420, Math.max(180, Math.round(size)))
}

/**
 * Create the root-scoped persistent Avatar preference store.
 * @returns Store definition for one shell root.
 */
export function createAvatarStore(): EngineStoreHandle<AvatarStoreState, AvatarActions> {
  return defineStore({
    init: (): AvatarStoreState => ({ enabled: true, image: null, preset: 'mina', size: 280 }),
    persist: 'dsh.avatar.v2',
    actions: {
      toggle: (draft) => { draft.enabled = !draft.enabled },
      setImage: (draft, image: string) => { draft.image = image; draft.enabled = true },
      selectPreset: (draft, preset: AvatarPresetId) => { draft.preset = preset; draft.image = null; draft.enabled = true },
      setSize: (draft, size: number) => { draft.size = clampAvatarSize(size) },
    },
  })
}

/**
 * Validate a selected image before FileReader loads it into persistent state.
 * @param file Browser file metadata to validate.
 * @returns A user-facing error, or `null` when the file is accepted.
 */
export function validateAvatarImage(file: Pick<File, 'size' | 'type'>): string | null {
  if (!(AVATAR_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return 'Choose a PNG, JPEG, WebP, or GIF image.'
  }
  if (file.size > MAX_AVATAR_IMAGE_BYTES) {
    return 'Choose an image smaller than 1.25 MB.'
  }
  return null
}
