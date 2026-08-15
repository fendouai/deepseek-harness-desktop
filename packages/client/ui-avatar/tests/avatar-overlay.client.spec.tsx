// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useSyncExternalStore } from 'react'
import { AvatarOverlay, avatarActivity, createAvatarStore } from '@deepseek-ai/dsh-client-ui-avatar/client'
import type { SessionListState } from '@deepseek-ai/dsh-client-runtime/client'

afterEach(() => { cleanup(); localStorage.clear() })

function hookOf<T>(store: { subscribe: (fn: () => void) => () => void; getSnapshot: () => T }) {
  return function useStore<S>(select: (state: T) => S): S {
    return select(useSyncExternalStore(store.subscribe, store.getSnapshot))
  }
}

function mount(running = false) {
  const store = createAvatarStore().create('overlay-test')
  store.actions.selectPreset('mina')
  const state = {
    ids: ['session'], current: 'session', phase: 'ready', subagentsByParent: {}, jobsBySession: {},
    byId: { session: { id: 'session', displayTitle: 'Session', running, blank: false, updatedAt: 1 } },
  } as unknown as SessionListState
  return {
    store,
    ...render(<AvatarOverlay
      useSessions={((select: (value: SessionListState) => unknown) => select(state)) as never}
      useWorkspaces={(() => undefined) as never}
      useStore={hookOf(store)}
      actions={store.actions}
    />),
  }
}

describe('Avatar overlay', () => {
  it('maps authoritative summary states', () => {
    expect(avatarActivity(undefined)).toBe('idle')
    expect(avatarActivity({ running: true, completed: true })).toBe('working')
    expect(avatarActivity({ running: false, completed: true })).toBe('complete')
  })

  it('shows the default character and follows running state', () => {
    const { getByLabelText, getByAltText } = mount(true)
    expect(getByLabelText('Avatar working')).toBeTruthy()
    expect(getByAltText('Mina Avatar character')).toBeTruthy()
  })

  it('toggles visibility and opens appearance controls', () => {
    const { queryByLabelText, getByRole, getByLabelText } = mount()
    fireEvent.click(getByRole('button', { name: 'Hide Avatar' }))
    expect(queryByLabelText('Avatar idle')).toBeNull()
    fireEvent.click(getByRole('button', { name: 'Appearance' }))
    expect(getByLabelText('Avatar appearance')).toBeTruthy()
    fireEvent.click(getByRole('button', { name: 'Rin' }))
    expect(getByLabelText('Avatar idle').querySelector('img')?.getAttribute('src')).toBe('/avatars/rin.png')
  })

  it('opens task conversation controls', () => {
    const { getByRole, getByLabelText } = mount()
    fireEvent.click(getByRole('button', { name: 'Talk' }))
    expect(getByLabelText('Talk to current task')).toBeTruthy()
    expect(getByLabelText('Message current task')).toBeTruthy()
  })

  it('does not request speech recognition from a bare desktop debug binary', () => {
    window.history.replaceState({}, '', '/?dshDesktopDebug=1')
    const { getByRole } = mount()
    fireEvent.click(getByRole('button', { name: 'Talk' }))
    fireEvent.click(getByRole('button', { name: 'Mic' }))
    expect(getByRole('alert').textContent).toContain('packaged macOS app')
    window.history.replaceState({}, '', '/')
  })
})
