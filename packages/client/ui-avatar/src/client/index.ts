/** Browser registration for the persistent session-aware Avatar overlay. */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { AvatarOverlay } from './AvatarOverlay.tsx'
import { createAvatarStore } from './store.ts'

/** Services required before the Avatar can occupy the shell overlay. */
export const inject = ['slots']

/** Register the Avatar beside other frame-wide overlays. */
export function apply(ctx: ClientContext): void {
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'avatar',
    order: 80,
    store: createAvatarStore,
  }, AvatarOverlay))
}

export { AvatarOverlay, avatarActivity, type AvatarActivity, type AvatarOverlayProps } from './AvatarOverlay.tsx'
export { createAvatarStore, clampAvatarSize, validateAvatarImage, MAX_AVATAR_IMAGE_BYTES } from './store.ts'
