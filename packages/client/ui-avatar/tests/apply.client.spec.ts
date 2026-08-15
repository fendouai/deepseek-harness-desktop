// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { createSnapshotStore, SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { apply, inject } from '@deepseek-ai/dsh-client-ui-avatar/client'
import { apply as nodeApply } from '@deepseek-ai/dsh-client-ui-avatar'
import * as invariant from '@deepseek-ai/dsh-client-ui-avatar/invariant'

describe('ui-avatar client apply', () => {
  it('waits for the overlay declaration, registers additively, and unwinds', async () => {
    const ctx = new Context()
    ctx.provide('sessions', {
      list: createSnapshotStore({ current: undefined }),
      binding: () => undefined,
    } as never)
    await ctx.plugin(SlotRegistry).await()
    const slots = ctx.get('slots') as SlotRegistry
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(slots.entries('shell.overlay')).toHaveLength(0)

    const layout = slots.register({
      name: 'root',
      children: { 'shell.overlay': { kind: 'list', scope: 'root' } },
    } as never, () => null)
    expect(slots.entries('shell.overlay')).toHaveLength(1)
    expect(slots.entries('shell.overlay')[0]!.options).toMatchObject({ id: 'avatar', order: 80 })

    layout()
    expect(slots.entries('shell.overlay')).toHaveLength(0)
    slots.register({
      name: 'root',
      children: { 'shell.overlay': { kind: 'list', scope: 'root' } },
    } as never, () => null)
    expect(slots.entries('shell.overlay')).toHaveLength(1)

    await fiber.dispose()
    expect(slots.entries('shell.overlay')).toHaveLength(0)
  })
})

describe('ui-avatar node half and invariant', () => {
  it('keeps Host behavior empty and reserves invariant ownership', async () => {
    nodeApply()
    const register = vi.fn().mockReturnValue(() => {})
    const dispose = await (invariant as { apply: (ctx: never) => Promise<() => void> }).apply({ invariants: { register } } as never)
    expect(register).toHaveBeenCalledWith('@deepseek-ai/dsh-client-ui-avatar', expect.any(Function))
    expect(dispose).toBeTypeOf('function')
  })
})
