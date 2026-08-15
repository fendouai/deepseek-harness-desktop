/** Current-session text feed used only to drive browser-side Avatar motion. */
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-runtime/client'

interface SessionsMotionFace {
  readonly list: ObservableSnapshot<{ current: string | undefined }>
  binding(id: string): { session: ObservableSnapshot<ConversationSnapshot> } | undefined
}

/**
 * Read the visible text accumulated for the in-flight assistant response.
 * @param snapshot Current conversation snapshot, or absence before binding.
 * @returns Concatenated visible partial-response text.
 */
export function partialSpeechText(snapshot: ConversationSnapshot | undefined): string {
  return snapshot?.partial?.blocks
    .filter(block => block.kind === 'text')
    .map(block => block.text)
    .join('') ?? ''
}

/** Observable speech-text projection that follows the selected session. */
export interface AvatarMotionSource extends ObservableSnapshot<string> {
  dispose(): void
}

/**
 * Project the current Session's partial assistant text into a small motion feed.
 * @param sessions Client sessions service.
 * @returns Disposable observable text source.
 */
export function createAvatarMotionSource(sessions: SessionsMotionFace): AvatarMotionSource {
  const listeners = new Set<() => void>()
  let text = ''
  let sessionDispose: (() => void) | undefined

  const publish = (next: string): void => {
    if (next === text) return
    text = next
    for (const listener of [...listeners]) listener()
  }
  const bind = (): void => {
    sessionDispose?.()
    sessionDispose = undefined
    const id = sessions.list.getSnapshot().current
    const session = id === undefined ? undefined : sessions.binding(id)?.session
    if (session === undefined) {
      publish('')
      return
    }
    const update = (): void => { publish(partialSpeechText(session.getSnapshot())) }
    sessionDispose = session.subscribe(update)
    update()
  }
  const listDispose = sessions.list.subscribe(bind)
  bind()

  return {
    getSnapshot: () => text,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener) } },
    dispose() { listDispose(); sessionDispose?.(); listeners.clear() },
  }
}
