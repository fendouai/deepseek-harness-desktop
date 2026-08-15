// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import {
  clampAvatarSize, createAvatarStore, MAX_AVATAR_IMAGE_BYTES, validateAvatarImage,
} from '@deepseek-ai/dsh-client-ui-avatar/client'

describe('Avatar store', () => {
  it('persists image, visibility, and clamped size through declared actions', () => {
    const store = createAvatarStore().create('test')
    store.actions.setImage('data:image/png;base64,AA==')
    store.actions.setSize(900)
    store.actions.toggle()
    expect(store.getSnapshot()).toEqual({
      enabled: false,
      image: 'data:image/png;base64,AA==',
      renderer: 'image',
      handsFreeVoice: false,
      speakReplies: false,
      preset: 'mina',
      size: 420,
    })
    store.actions.selectPreset('rin')
    expect(store.getSnapshot().image).toBeNull()
    expect(store.getSnapshot().preset).toBe('rin')
    store.actions.useVrm()
    expect(store.getSnapshot().renderer).toBe('vrm')
    store.actions.toggleSpeakReplies()
    expect(store.getSnapshot().speakReplies).toBe(true)
    store.actions.toggleHandsFreeVoice()
    expect(store.getSnapshot().handsFreeVoice).toBe(true)
  })

  it('clamps character size symmetrically', () => {
    expect(clampAvatarSize(100)).toBe(180)
    expect(clampAvatarSize(287.6)).toBe(288)
    expect(clampAvatarSize(500)).toBe(420)
  })

  it('rejects unsupported and oversized source files', () => {
    expect(validateAvatarImage({ type: 'image/svg+xml', size: 20 })).toMatch(/PNG/)
    expect(validateAvatarImage({ type: 'image/png', size: MAX_AVATAR_IMAGE_BYTES + 1 })).toMatch(/1\.25 MB/)
    expect(validateAvatarImage({ type: 'image/webp', size: MAX_AVATAR_IMAGE_BYTES })).toBeNull()
  })
})
