/** Browser registration for the persistent session-aware Avatar overlay. */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { createElement, useSyncExternalStore } from 'react'
import { AvatarOverlay } from './AvatarOverlay.tsx'
import type { AvatarOverlayProps } from './AvatarOverlay.tsx'
import { createAvatarMotionSource } from './motion.ts'
import { createAvatarStore } from './store.ts'

/** Services required before the Avatar can occupy the shell overlay. */
export const inject = ['slots', 'sessions']

/** Register the Avatar beside other frame-wide overlays. */
export function apply(ctx: ClientContext): void {
  const motion = createAvatarMotionSource(ctx.sessions)
  ctx.effect(() => motion.dispose)
  const AvatarSlot = (props: AvatarOverlayProps) => {
    const speechText = useSyncExternalStore(motion.subscribe, motion.getSnapshot, motion.getSnapshot)
    return createElement(AvatarOverlay, { ...props, speechText })
  }
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'avatar',
    order: 80,
    store: createAvatarStore,
  }, AvatarSlot))
}

export { AvatarOverlay, avatarActivity, type AvatarActivity, type AvatarOverlayProps } from './AvatarOverlay.tsx'
export { createAvatarStore, clampAvatarSize, validateAvatarImage, MAX_AVATAR_IMAGE_BYTES } from './store.ts'
export { createAvatarMotionSource, partialSpeechText, type AvatarMotionSource } from './motion.ts'
export { visemeForText } from './VrmAvatar.tsx'
