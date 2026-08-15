// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { partialSpeechText, visemeForText } from '@deepseek-ai/dsh-client-ui-avatar/client'
import { VRMExpressionPresetName } from '@pixiv/three-vrm'
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'

describe('Avatar motion projection', () => {
  it('reads only in-flight visible text blocks', () => {
    const snapshot = {
      partial: { turn: 1, step: 1, blocks: [
        { kind: 'reasoning', text: 'hidden' },
        { kind: 'text', text: '你' },
        { kind: 'text', text: '好' },
      ] },
    } as unknown as ConversationSnapshot
    expect(partialSpeechText(snapshot)).toBe('你好')
    expect(partialSpeechText(undefined)).toBe('')
  })

  it('maps Chinese and Latin endings onto VRM mouth presets', () => {
    expect(visemeForText('哈')).toBe(VRMExpressionPresetName.Aa)
    expect(visemeForText('hi')).toBe(VRMExpressionPresetName.Ih)
    expect(visemeForText('you')).toBe(VRMExpressionPresetName.Ou)
    expect(visemeForText('hello')).toBe(VRMExpressionPresetName.Oh)
  })
})
